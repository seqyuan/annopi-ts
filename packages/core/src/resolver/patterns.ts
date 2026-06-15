export const PARAM_PATTERN = /\$\{([^}]+)\}/g
export const OPTIONAL_BLOCK_PATTERN = /\$\{([^}?]+)\?\s*([^}]*)\}/g
export const CROSS_REF_PATTERN = /\$\{sample\[([^=]+)=([^\]]+)\]\.([^}]+)\}/g
export const CMP_SAMPLES_PATTERN = /\$\{cmp\.(case_samples|control_samples)\.([^}]+)\}/g
