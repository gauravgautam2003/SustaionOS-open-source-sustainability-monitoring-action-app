const activeLocks = new Set();

let previousBodyOverflow = "";
let previousBodyPaddingRight = "";
let previousHtmlOverscrollBehavior = "";

const isBrowser = () => typeof document !== "undefined";

export const lockBodyScroll = (key) => {
  if (!isBrowser() || !key) return;

  const body = document.body;
  const html = document.documentElement;

  if (activeLocks.size === 0) {
    previousBodyOverflow = body.style.overflow;
    previousBodyPaddingRight = body.style.paddingRight;
    previousHtmlOverscrollBehavior = html.style.overscrollBehavior;

    const scrollbarWidth = window.innerWidth - html.clientWidth;
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }

    body.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";
  }

  activeLocks.add(key);
};

export const unlockBodyScroll = (key) => {
  if (!isBrowser() || !key || !activeLocks.has(key)) return;

  activeLocks.delete(key);

  if (activeLocks.size > 0) return;

  const body = document.body;
  const html = document.documentElement;

  body.style.overflow = previousBodyOverflow;
  body.style.paddingRight = previousBodyPaddingRight;
  html.style.overscrollBehavior = previousHtmlOverscrollBehavior;

  previousBodyOverflow = "";
  previousBodyPaddingRight = "";
  previousHtmlOverscrollBehavior = "";
};
