---
title: GitHub Slicing
icon: lucide/git-branch
---

# GitHub Slicing

The GitHub page slices models from the CI artifacts of GitHub repositories on
demand, then starts the print. The slicing runs in the auto-slicer2 bot, which
connects to Moonraker as the agent `autoslice`. The page's entry in the
navigation appears only while that agent is connected.

## Slicing a model

The page walks through four views. **Back** in the card's title bar returns to
the previous one.

1. **Projects** lists the artifacts of each repository's latest successful CI
   run, with the commit, age and size of each. **Refresh** reloads the list.
2. **Models** lists the models in the artifact. Their thumbnails appear one at
   a time, as the agent renders them.
3. **Options** lists the repository's rules and, when the repository slices a
   matrix, one row of options per dimension (material, support, and so on).
   Picking a rule replaces the matrix selection, and picking an option returns
   to the matrix. A check mark marks every rule and option that already has a
   G-code, and **Slice** then reads **Slice again**.
4. **Job** follows the slice: queued, slicing, then waiting for the G-code to
   reach the printer, which happens a few seconds after the slice. Once
   Moonraker sees the file, **Print** starts it and opens the dashboard.
   **Slice another** returns to the options.
