/**
 * BlurShield — Detection Engine
 *
 * Combines the generic detectors (semantic, heuristic, media) with the
 * current site's profile (if any) into a single set of "sensitive"
 * elements for a given root node. This is the one place that decides
 * *what* gets blurred; BlurEngine only decides *how*.
 */
(function () {
  const BlurShield = (window.BlurShield = window.BlurShield || {});

  function profileInclude(root, profile) {
    const found = new Set();
    for (const sel of profile.include || []) {
      let matches;
      try {
        matches = root.querySelectorAll(sel);
      } catch {
        continue;
      }
      for (const el of matches) found.add(el);
    }
    return found;
  }

  function profileExcludes(el, profile) {
    for (const sel of profile.exclude || []) {
      try {
        if (el.matches(sel) || el.closest(sel)) return true;
      } catch {
        /* ignore invalid selector */
      }
    }
    return false;
  }

  function isCodeElement(el) {
     return el.tagName === 'PRE' || el.tagName === 'CODE' || el.closest('pre, code') !== null;
   }
 
   /**
    * Scans `root` (document on first pass, or a newly-added subtree on
    * mutation) and returns { elements: Set<Element>, mode }.
    * mode is 'default' | 'code' | 'document', from the active site profile.
    */
   function scan(root, hostname, settings) {
     const profile = BlurShield.sites.resolve(hostname);
     const candidates = new Set();
 
     // 1) Semantic pass — always runs, catches most real chat/doc apps.
     for (const el of BlurShield.detectors.semantic.scan(root)) {
       if (!settings.alwaysBlurCode && isCodeElement(el)) continue;
       candidates.add(el);
     }
 
     // 2) Media pass — images/video/canvas/attachments, gated by settings.
     if (settings.alwaysBlurImages) {
       for (const el of BlurShield.detectors.media.scan(root)) candidates.add(el);
     }
 
     // 3) Site-profile include list — sharpens/adds site-specific containers.
     for (const el of profileInclude(root, profile)) candidates.add(el);
 
     // 4) Heuristic fallback — only if the above found very little, so we
     //    don't double-blur pages that already matched plenty semantically.
     if (candidates.size < 3) {
       for (const el of BlurShield.detectors.heuristic.scan(root)) {
         if (!settings.alwaysBlurCode && isCodeElement(el)) continue;
         candidates.add(el);
       }
     }
 
     // 5) Apply profile-level exclusions (sidebar, file tree, nav) last —
     //    these always win over inclusion, matching the "keep sidebar
     //    visible" requirements for AI sites / WhatsApp / GitHub.
     const finalElements = new Set();
     for (const el of candidates) {
       if (profileExcludes(el, profile)) continue;
       if (BlurShield.detectors.semantic.isExcluded(el)) continue;
       finalElements.add(el);
     }
 
     return { elements: finalElements, mode: profile.mode || 'default' };
   }

  BlurShield.engine = BlurShield.engine || {};
  BlurShield.engine.detection = { scan };
})();
