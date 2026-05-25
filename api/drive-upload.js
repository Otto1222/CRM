/**
 * Google Drive feltöltés - Service Account alapú
 * Nem igényel MCP-t, közvetlenül a Drive API-t használja
 */
import { google } from 'googleapis';

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const serviceAccountKey = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || "{}");
    
    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccountKey,
      scopes: [
        "https://www.googleapis.com/auth/drive",
        "https://www.googleapis.com/auth/gmail.send",
      ],
    });

    const drive = google.drive({ version: "v3", auth });
    const { action, ...params } = req.body;

    if (action === "createFolder") {
      // Mappa létrehozás: Claude/CRM/Munkák/{munkalapId}
      const { folderName, parentId } = params;
      
      // Ellenőrzés hogy létezik-e már
      const existing = await drive.files.list({
        q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`,
        fields: "files(id, name)",
      });
      
      if (existing.data.files.length > 0) {
        return res.json({ ok: true, folderId: existing.data.files[0].id, existed: true });
      }
      
      const folder = await drive.files.create({
        requestBody: {
          name: folderName,
          mimeType: "application/vnd.google-apps.folder",
          parents: [parentId],
        },
        fields: "id",
      });
      
      return res.json({ ok: true, folderId: folder.data.id });
    }

    if (action === "uploadFile") {
      // Fájl feltöltés
      const { fileName, fileContent, mimeType, folderId } = params;
      const buffer = Buffer.from(fileContent, "base64");
      
      const file = await drive.files.create({
        requestBody: { name: fileName, parents: [folderId] },
        media: { mimeType, body: require("stream").Readable.from(buffer) },
        fields: "id, webViewLink",
      });
      
      return res.json({ ok: true, fileId: file.data.id, url: file.data.webViewLink });
    }

    if (action === "saveJson") {
      // JSON adatok mentése/frissítése
      const { fileName, content, folderId } = params;
      
      // Meglévő fájl keresése
      const existing = await drive.files.list({
        q: `name='${fileName}' and '${folderId}' in parents and trashed=false`,
        fields: "files(id)",
      });
      
      const jsonBuffer = Buffer.from(JSON.stringify(content, null, 2), "utf-8");
      const stream = require("stream").Readable.from(jsonBuffer);
      
      if (existing.data.files.length > 0) {
        await drive.files.update({
          fileId: existing.data.files[0].id,
          media: { mimeType: "application/json", body: stream },
        });
        return res.json({ ok: true, updated: true });
      } else {
        await drive.files.create({
          requestBody: { name: fileName, parents: [folderId] },
          media: { mimeType: "application/json", body: stream },
        });
        return res.json({ ok: true, created: true });
      }
    }

    return res.status(400).json({ error: "Ismeretlen action" });

  } catch (err) {
    console.error("[drive-upload]", err);
    return res.status(500).json({ error: err.message });
  }
}
