import React, { useState, useEffect } from "react";

// Textarea that starts empty and "types" an example as its placeholder on a
// loop, inviting you to type your own. Clears the instant you start writing.
export default function TypingBox({ value, onChange, sample, idle }) {
  const [ph, setPh] = useState("");
  useEffect(() => {
    if (value) { setPh(""); return; }
    let i = 0, to;
    const step = () => {
      i++; setPh(sample.slice(0, i));
      if (i < sample.length) to = setTimeout(step, sample[i - 1] === "\n" ? 280 : 24 + Math.random() * 46);
      else to = setTimeout(() => { i = 0; setPh(""); to = setTimeout(step, 520); }, 2600);
    };
    to = setTimeout(step, 600);
    return () => clearTimeout(to);
  }, [value, sample]);
  return (
    <textarea
      className="ta"
      value={value}
      onChange={onChange}
      placeholder={value ? "" : ph ? ph + "▍" : idle}
    />
  );
}
