---
name: fundo-padrao-foto
description: Standardize leather bag photos into a consistent premium catalog look with a warm neutral background, soft natural lighting, realistic shadow, and preserved product identity. Use when Codex receives one or more bag photos and needs to edit them into matching ecommerce or catalog images for VW Couros-style presentation.
---

# Bag Background Standardizer

Use this skill to turn real leather bag photos into a consistent catalog set without making them look illustrated or fake.

## Workflow

1. Treat the request as an image edit, not a fresh image generation.
2. Inspect the input image and lock the product details that cannot drift:
- bag silhouette and proportions
- leather color and grain
- stitching, folds, straps, knots, zipper pulls, hardware, and logo plaque
- original viewing angle unless the user explicitly asks to change it
3. Replace only the background and normalize the lighting enough to unify the catalog.
4. Keep the result photographic, premium, and believable.
5. If the user sends several bags, reuse the same backdrop family, light direction, shadow softness, and framing logic across all outputs.

## Target Look

- Warm neutral studio background in the beige, camel, sand, ivory, or soft taupe family
- Matte texture like fine paper, suede, plaster, or premium backdrop cloth
- Soft diffused front or 3/4 lighting
- Gentle contact shadow to ground the bag naturally
- Premium editorial catalog feel
- More natural than the current website placeholders

## Default Constraints

- Change only the background and the light balancing needed for consistency
- Keep the bag as the hero object
- Preserve leather texture, wrinkles, stitching, and hardware reflections
- Keep the product color truthful to the original photo
- Do not turn the bag into a flat icon, vector, or CGI-looking object
- Do not add props, shelves, scenery, text, watermark, or extra accessories unless asked
- Do not create harsh cutout halos or floating-bag effects

## Prompt Recipe

Use this structure when editing:

```text
Use case: product-mockup
Asset type: ecommerce catalog image
Primary request: standardize this leather bag photo for a consistent premium catalog
Input images: Image 1 = edit target
Scene/backdrop: warm neutral matte studio background, lightly textured, elegant and minimal
Style/medium: realistic product photography
Composition/framing: centered bag, balanced breathing room, keep the original angle, avoid aggressive crop
Lighting/mood: soft diffused studio light, subtle grounding shadow, calm premium mood
Materials/textures: preserve real leather grain, stitching, hardware, logo plaque, and natural folds
Constraints: change only background and light normalization; preserve model, color, shape, texture, branding, and hardware
Avoid: vector look, fake CGI, floating bag, hard cutout edges, props, text, watermark, dramatic spotlight, color shift
```

For ready-to-paste prompts, see [references/prompt-recipes.md](references/prompt-recipes.md).

## Batch Use

For multiple bags, keep the same:
- background family
- light direction
- shadow softness
- framing logic
- output ratio

Approve one image first, then use it as the style anchor for the rest of the collection.
