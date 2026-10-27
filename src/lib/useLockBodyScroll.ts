"use client";

import { useEffect } from "react";

let lockCount = 0;
let previousBodyOverflow = "";
let previousHtmlOverflow = "";
let previousBodyPaddingRight = "";

export function useLockBodyScroll(isLocked: boolean = true) {
  useEffect(() => {
    if (!isLocked) return;
    if (typeof window === "undefined" || typeof document === "undefined") return;

    if (lockCount === 0) {
      previousBodyOverflow = document.body.style.overflow;
      previousHtmlOverflow = document.documentElement.style.overflow;
      previousBodyPaddingRight = document.body.style.paddingRight;

      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

      document.documentElement.classList.add("modal-open");
      document.body.classList.add("modal-open");

      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";

      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }
    }

    lockCount++;

    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) {
        document.documentElement.classList.remove("modal-open");
        document.body.classList.remove("modal-open");

        document.body.style.overflow = previousBodyOverflow;
        document.documentElement.style.overflow = previousHtmlOverflow;
        document.body.style.paddingRight = previousBodyPaddingRight;
      }
    };
  }, [isLocked]);
}
