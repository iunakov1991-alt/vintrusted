MINI-TRIZ CORE FOR MONSTER BUYER GUIDES

CONTRADICTION:
"Monster must produce expert-level buyer guides for many model-years
with limited model capacity and strict runtime constraints."

IDEAL FINAL RESULT (IFR):
- Each buyer guide reads like a professional report
  from a DMV/insurance/mechanic expert team.
- Generated in small, stable chunks (sections),
  with code combining them into a coherent document.
- No runtime overload, no hallucinated VIN facts,
  high consistency across thousands of pages.

PRINCIPLES:

1) SEGMENTATION
- Generate individual sections (engine reliability, transmission, issues, checklist)
  instead of monolithic, single-shot articles.

2) USE OF RESOURCES
- Use:
  - domain knowledge (VIN/title/state/fraud files),
  - golden example articles,
  - competitor structural insights,
  - Google Search Essentials summary.
- Reuse proven patterns, not raw text.

3) DYNAMICS
- Depth per page should adapt to:
  - competition strength,
  - importance of model,
  - performance of similar pages in LTR engine.

4) SEPARATION OF ROLES
- Code is responsible for:
  - structure,
  - length,
  - section ordering,
  - schema.
- Model is responsible for:
  - filling semantic slots with meaningful, non-generic content,
  - obeying MUST/NEVER rules.

5) FEEDBACK
- LTR / quality scores adjust:
  - which semantic tiers appear more often,
  - which topics get more depth,
  - which layouts work best.

Monster must always trade "more words" for "more meaning":
fewer, denser, more useful paragraphs instead of verbose fluff.











