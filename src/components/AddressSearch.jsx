import { useState, useRef, useEffect } from "react";
import { C, FONT } from "../lib/constants";
import { geocodeAddress } from "../lib/geoService";

const INP_STYLE = {
  width: "100%",
  boxSizing: "border-box",
  padding: "9px 12px",
  border: `1.5px solid ${C.border}`,
  borderRadius: 9,
  fontSize: 14,
  fontFamily: FONT,
  outline: "none",
  background: "#FAFAFA",
};

/**
 * Cím beviteli mező OpenStreetMap/Nominatim autocomplete-tel.
 *
 * Props:
 *   value      – aktuális szöveg
 *   onChange   – (newValue: string) callback amikor a user gépel
 *   onSelect   – (result: { display_name, lat, lon }) callback amikor kiválaszt egy javaslatot
 *   placeholder
 *   style      – extra stílusok az input-ra
 */
export default function AddressSearch({ value, onChange, onSelect, placeholder, style }) {
  const [results, setResults] = useState([]);
  const [open,    setOpen]    = useState(false);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef(null);
  const wrapRef  = useRef(null);

  // Kattintás kívülre → bezárja a dropdown-t
  useEffect(() => {
    function handleClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleChange(e) {
    const v = e.target.value;
    onChange(v);
    clearTimeout(timerRef.current);
    if (v.length < 4) { setResults([]); setOpen(false); return; }
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      const r = await geocodeAddress(v, 6);
      setResults(r);
      setOpen(r.length > 0);
      setLoading(false);
    }, 600); // 600ms debounce – Nominatim rate limit tiszteletben tartása
  }

  function handleSelect(r) {
    onChange(r.display_name);
    onSelect?.(r);
    setOpen(false);
    setResults([]);
  }

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <div style={{ position: "relative" }}>
        <input
          value={value || ""}
          onChange={handleChange}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={placeholder || "Cím keresése…"}
          style={{ ...INP_STYLE, paddingRight: loading ? 32 : 12, ...style }}
        />
        {loading && (
          <span style={{
            position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
            fontSize: 11, color: C.muted,
          }}>⏳</span>
        )}
      </div>

      {open && results.length > 0 && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
          background: "#fff", border: `1.5px solid ${C.border}`, borderRadius: 9,
          boxShadow: "0 8px 24px rgba(0,0,0,.12)", zIndex: 3000,
          maxHeight: 220, overflowY: "auto",
        }}>
          {results.map((r, i) => (
            <div
              key={i}
              onMouseDown={() => handleSelect(r)}
              style={{
                padding: "9px 12px",
                cursor: "pointer",
                fontSize: 13,
                fontFamily: FONT,
                borderBottom: i < results.length - 1 ? `1px solid ${C.bg}` : "none",
                lineHeight: 1.4,
              }}
              onMouseEnter={e => e.currentTarget.style.background = C.accentLight}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <span style={{ fontWeight: 600, color: C.text }}>
                {r.address?.road
                  ? `${r.address.road}${r.address.house_number ? " " + r.address.house_number : ""}, ${r.address.city || r.address.town || r.address.village || ""}`
                  : r.display_name.split(",").slice(0, 3).join(",")}
              </span>
              <br />
              <span style={{ fontSize: 11, color: C.muted }}>
                {r.address?.postcode ? r.address.postcode + " " : ""}
                {r.address?.county || ""}
              </span>
            </div>
          ))}
          <div style={{ padding: "5px 12px 7px", fontSize: 10, color: C.border, textAlign: "right" }}>
            © OpenStreetMap
          </div>
        </div>
      )}
    </div>
  );
}
