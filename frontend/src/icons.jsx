import React from 'react';

const BaseIcon = ({ children, ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ marginRight: '0.6rem', opacity: 0.9, ...props.style }}
    {...props}
  >
    {children}
  </svg>
);

export const IconUsers = (props) => (
  <BaseIcon {...props}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </BaseIcon>
);

export const IconTrendingUp = (props) => (
  <BaseIcon {...props}>
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
    <polyline points="17 6 23 6 23 12"></polyline>
  </BaseIcon>
);

export const IconFileText = (props) => (
  <BaseIcon {...props}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
    <line x1="16" y1="13" x2="8" y2="13"></line>
    <line x1="16" y1="17" x2="8" y2="17"></line>
    <polyline points="10 9 9 9 8 9"></polyline>
  </BaseIcon>
);

export const IconPenTool = (props) => (
  <BaseIcon {...props}>
    <path d="M12 19l7-7 3 3-7 7-3-3z"></path>
    <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path>
    <path d="M2 2l7.586 7.586"></path>
    <circle cx="11" cy="11" r="2"></circle>
  </BaseIcon>
);

export const IconHardHat = (props) => (
  <BaseIcon {...props}>
    <path d="M2 18a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v2z"></path>
    <path d="M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5"></path>
    <path d="M4 15v-3a6 6 0 0 1 6-6h0"></path>
    <path d="M14 6h0a6 6 0 0 1 6 6v3"></path>
  </BaseIcon>
);

export const IconClock = (props) => (
  <BaseIcon {...props}>
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </BaseIcon>
);

export const IconWallet = (props) => (
  <BaseIcon {...props}>
    <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"></path>
    <path d="M3 5v14a2 2 0 0 0 2 2h16v-5"></path>
    <path d="M18 12a2 2 0 0 0 0 4h4v-4Z"></path>
  </BaseIcon>
);

export const IconSettings = (props) => (
  <BaseIcon {...props}>
    <circle cx="12" cy="12" r="3"></circle>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
  </BaseIcon>
);

export const IconPackage = (props) => (
  <BaseIcon {...props}>
    <line x1="16.5" y1="9.4" x2="7.5" y2="4.21"></line>
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
    <line x1="12" y1="22.08" x2="12" y2="12"></line>
  </BaseIcon>
);

export const IconLock = (props) => (
  <BaseIcon {...props}>
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
  </BaseIcon>
);

export const IconChevronRight = (props) => (
  <BaseIcon {...props} style={{ marginRight: 0, opacity: 0.7, ...props.style }}>
    <polyline points="9 18 15 12 9 6"></polyline>
  </BaseIcon>
);

export const IconKey = (props) => (
  <BaseIcon {...props}>
    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path>
  </BaseIcon>
);

export const IconLogOut = (props) => (
  <BaseIcon {...props}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
    <polyline points="16 17 21 12 16 7"></polyline>
    <line x1="21" y1="12" x2="9" y2="12"></line>
  </BaseIcon>
);

export const IconCheckCircle = (props) => (
  <BaseIcon {...props}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </BaseIcon>
);

export const IconPalette = (props) => (
  <BaseIcon {...props}>
    <circle cx="13.5" cy="6.5" r=".5"></circle>
    <circle cx="17.5" cy="10.5" r=".5"></circle>
    <circle cx="8.5" cy="7.5" r=".5"></circle>
    <circle cx="6.5" cy="12.5" r=".5"></circle>
    <path d="M12 2a10 10 0 0 0 0 20h1a2 2 0 0 0 1.7-3.1 2 2 0 0 1 1.7-3.1H18a4 4 0 0 0 4-4A10 10 0 0 0 12 2z"></path>
  </BaseIcon>
);

export const IconRuler = (props) => (
  <BaseIcon {...props}>
    <path d="M21.3 8.7 15.3 2.7a2.4 2.4 0 0 0-3.4 0L2.7 11.9a2.4 2.4 0 0 0 0 3.4l6 6a2.4 2.4 0 0 0 3.4 0l9.2-9.2a2.4 2.4 0 0 0 0-3.4Z"></path>
    <path d="m7.5 10.5 2 2M10.5 7.5l2 2M13.5 4.5l2 2M4.5 13.5l2 2"></path>
  </BaseIcon>
);

export const IconEdit = (props) => (
  <BaseIcon {...props}>
    <path d="M12 20h9"></path>
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z"></path>
  </BaseIcon>
);

export const IconPlusCircle = (props) => (
  <BaseIcon {...props}>
    <circle cx="12" cy="12" r="10"></circle>
    <path d="M12 8v8M8 12h8"></path>
  </BaseIcon>
);

export const IconTrash = (props) => (
  <BaseIcon {...props}>
    <path d="M3 6h18M8 6V4h8v2m3 0-.9 14H5.9L5 6m4 4v6m6-6v6"></path>
  </BaseIcon>
);

export const IconSearch = (props) => (
  <BaseIcon {...props}>
    <circle cx="11" cy="11" r="8"></circle>
    <path d="m21 21-4.35-4.35"></path>
  </BaseIcon>
);

export const IconXCircle = (props) => (
  <BaseIcon {...props}>
    <circle cx="12" cy="12" r="10"></circle>
    <path d="m15 9-6 6m0-6 6 6"></path>
  </BaseIcon>
);
