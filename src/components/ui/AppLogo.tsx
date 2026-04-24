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
      {/* Background gear */}
      <path
        d="M366.5 281.5C362.8 288.5 358 295 352.5 301.5C345.5 309 344 319.5 348 328L361 356C365 365 362.5 375 354 380C343 386.5 330.5 391 317 394C307.5 396 298.5 391.5 295.5 382.5L286.5 3525C284.5 344.5 278 338.5 269.5 337C259.5 335.5 251.5 343 250.5 353L247 384C246 394 237.5 401 227.5 401C212.5 401 198 397.5 184 391C175.5 387 172.5 376 177 368.5L191.5 342.5C195.5 335.5 194.5 326.5 188.5 320C183 314 177 308.5 170.5 303.5C163.5 298.5 153.5 299.5 147 305L123.5 324C116 330 105.5 329 99 321.5C92.5 313.5 87 304.5 82 295C77 286.5 78.5 275.5 86.5 269L109.5 252C116.5 247 121 239.5 120 231C118.5 222.5 112 215.5 103 213.5L74 207C64 205 57 196 57 186C57 171.5 60.5 157.5 66.5 144C70 135 79.5 130.5 89 133L118 139.5C126.5 141.5 133 136 135 127.5C136.5 119 130.5 109 122 106L94.5 95C85.5 91 81.5 80.5 86 73C92 63.5 99.5 54.5 107.5 46.5C114.5 39.5 125 39 132 44.5L157 63C163.5 68 174 67.5 180.5 61.5C186.5 56 193 51.5 200 47.5C207.5 43 214 47 217 54.5L227.5 81.5C230.5 89.5 238 95 246.5 94.5C255 93.5 262 86 261 77.5L258 48C257 38 264.5 30 274.5 30C290.5 30 306 34 320.5 40C329 43.5 332.5 53.5 328.5 61.5L314 88C310 95.5 311 105 317.5 111.5C324 117.5 330.5 124 336 130.5C342.5 137.5 352.5 138.5 359 133.5L384.5 116C392 110.5 403 111.5 409.5 119C417 127.5 423.5 136.5 428.5 146.5C434 154.5 432.5 165.5 424.5 171.5L400 188.5C392.5 193.5 387.5 201 388.5 209.5C389.5 218 396 224.5 404.5 226.5L433.5 233C443.5 235 450.5 244 450.5 254"
        fill="#2A7B8E"
      />
      {/* Background shadow for notebook */}
      <rect x="171" y="104" width="220" height="300" rx="20" fill="white" />
      {/* Notebook ring backings */}
      <rect x="156" y="152" width="30" height="12" rx="6" fill="#1C5C6B" />
      <rect x="156" y="212" width="30" height="12" rx="6" fill="#1C5C6B" />
      <rect x="156" y="272" width="30" height="12" rx="6" fill="#1C5C6B" />
      {/* Notebook outer edge */}
      <rect x="166" y="104" width="220" height="300" rx="30" fill="none" stroke="#2A7B8E" strokeWidth="20" />
      {/* Notebook rings */}
      <rect x="150" y="152" width="30" height="12" rx="6" fill="#2A7B8E" />
      <rect x="150" y="212" width="30" height="12" rx="6" fill="#2A7B8E" />
      <rect x="150" y="272" width="30" height="12" rx="6" fill="#2A7B8E" />
      {/* Lines placeholder */}
      <rect x="220" y="154" width="120" height="12" rx="6" fill="#2A7B8E" />
      <rect x="220" y="214" width="120" height="12" rx="6" fill="#2A7B8E" />
      <rect x="220" y="274" width="120" height="12" rx="6" fill="#2A7B8E" />
      
      {/* Checkmark overlaying lines */}
      <path d="M260 216L288 244L344 188" stroke="#77B84E" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
