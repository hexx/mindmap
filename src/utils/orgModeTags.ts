export type OrgModeSideTag = 'LEFT' | 'RIGHT';

const SIDE_TAG_PATTERN = /\s*:(LEFT|RIGHT):\s*$/;

export const getOrgModeSideTag = (label: string) => label.match(SIDE_TAG_PATTERN)?.[1] as OrgModeSideTag | undefined;

export const stripOrgModeSideTag = (label: string) => label.replace(SIDE_TAG_PATTERN, '').trim();

export const appendOrgModeSideTag = (label: string, sideTag: OrgModeSideTag) => `${label} :${sideTag}:`;
