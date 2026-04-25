import React from "react";

export default function AppLogo({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
    >
      <defs>
        <clipPath id="left-clip-logo">
          <rect x="0" y="0" width="256" height="512" />
        </clipPath>
        <clipPath id="right-clip-logo">
          <rect x="256" y="0" width="256" height="512" />
        </clipPath>
        <g id="gear-shape-logo">
          <rect x="216" y="50" width="80" height="412" rx="16" />
          <rect x="50" y="216" width="412" height="80" rx="16" />
          <rect x="216" y="50" width="80" height="412" rx="16" transform="rotate(45 256 256)" />
          <rect x="216" y="50" width="80" height="412" rx="16" transform="rotate(-45 256 256)" />
          <circle cx="256" cy="256" r="160" />
        </g>
        <g id="notebook-outline-logo">
          <rect x="156" y="140" width="180" height="232" rx="28" fill="none" strokeWidth="24" />
          <rect x="132" y="180" width="48" height="16" rx="8" />
          <rect x="132" y="248" width="48" height="16" rx="8" />
          <rect x="132" y="316" width="48" height="16" rx="8" />
          <rect x="180" y="180" width="100" height="16" rx="8" />
          <rect x="180" y="235" width="80" height="16" rx="8" />
          <rect x="180" y="290" width="120" height="16" rx="8" />
        </g>
      </defs>

      <use href="#gear-shape-logo" fill="#185669" clipPath="url(#left-clip-logo)" />
      <use href="#gear-shape-logo" fill="#217b96" clipPath="url(#right-clip-logo)" />

      <rect x="156" y="140" width="180" height="232" rx="28" fill="white" />
      
      <use href="#notebook-outline-logo" fill="#185669" stroke="#185669" clipPath="url(#left-clip-logo)" />
      <use href="#notebook-outline-logo" fill="#217b96" stroke="#217b96" clipPath="url(#right-clip-logo)" />

      <path d="M245 270 L275 300 L345 210" stroke="#71b54a" strokeWidth="24" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}
