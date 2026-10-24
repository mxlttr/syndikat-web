const logos = import.meta.glob("../assets/images/logos/*.png", { eager: true, import: "default" });

export const shopLogoUrl = (handle, theme) => logos[`../assets/images/logos/${handle}-${theme}.png`]?.src;
