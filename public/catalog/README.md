# Catalog images

Drop image files in here and they will be picked up automatically by the
storefront whenever an admin hasn't uploaded a real photo for that
category / service / option.

## Folder structure

```
public/catalog/
  categories/
    <category-slug>.jpg              e.g. mk-events.jpg, mk-foods.jpg
  services/
    <service-slug>.jpg               e.g. mascot-character.jpg
    <service-slug>/                  optional folder if a service has more than one default photo
      cover.jpg
      1.jpg
      2.jpg
  options/
    <service-slug>/
      <option-slug>.jpg              e.g. options/car-rental/suv-standard-toyota-highlander.jpg
      <option-slug>/                 optional folder for multiple available items
        1.jpg
        2.jpg
```

- File names are slugified versions of the category / service / option label
  (lower-case, spaces & punctuation become `-`).
- Allowed extensions: `.jpg`, `.jpeg`, `.png`, `.webp`.
- After adding or removing files, update `public/catalog/manifest.json` so the
  app knows what's available (no rebuild needed). See that file for the format.

## Switching to Cloudinary later

The image provider is pluggable. To switch the whole site over to Cloudinary,
set these two env vars in `.env` and rebuild — no code changes required:

```
VITE_IMAGE_PROVIDER=cloudinary
VITE_CLOUDINARY_CLOUD_NAME=your-cloud-name
# Optional — folder prefix inside your Cloudinary account
VITE_CLOUDINARY_FOLDER=mk-hub
```

The Cloudinary provider expects assets to live at the same logical paths,
e.g. `mk-hub/options/car-rental/suv-standard-toyota-highlander`.