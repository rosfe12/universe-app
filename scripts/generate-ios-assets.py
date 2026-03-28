from pathlib import Path

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[1]
ICON_SOURCE = ROOT / "public" / "icons" / "icon-512.png"
APP_ICON_TARGET = ROOT / "ios" / "App" / "App" / "Assets.xcassets" / "AppIcon.appiconset" / "AppIcon-512@2x.png"
SPLASH_DIR = ROOT / "ios" / "App" / "App" / "Assets.xcassets" / "Splash.imageset"
RESOURCE_DIR = ROOT / "resources" / "ios"

BACKGROUND = "#0F172A"
CANVAS_SIZE = 2732
ICON_SIZE = 840


def ensure_parent(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)


def build_splash(icon: Image.Image) -> Image.Image:
    canvas = Image.new("RGBA", (CANVAS_SIZE, CANVAS_SIZE), BACKGROUND)
    safe_icon = ImageOps.contain(icon, (ICON_SIZE, ICON_SIZE), Image.Resampling.LANCZOS)
    x = (CANVAS_SIZE - safe_icon.width) // 2
    y = (CANVAS_SIZE - safe_icon.height) // 2
    canvas.alpha_composite(safe_icon, (x, y))
    return canvas


def main() -> None:
    icon = Image.open(ICON_SOURCE).convert("RGBA")
    app_icon = ImageOps.fit(icon, (1024, 1024), Image.Resampling.LANCZOS)

    ensure_parent(APP_ICON_TARGET)
    app_icon.save(APP_ICON_TARGET)

    RESOURCE_DIR.mkdir(parents=True, exist_ok=True)
    app_icon.save(RESOURCE_DIR / "app-icon-1024.png")

    splash = build_splash(icon)
    splash_targets = [
        SPLASH_DIR / "splash-2732x2732.png",
        SPLASH_DIR / "splash-2732x2732-1.png",
        SPLASH_DIR / "splash-2732x2732-2.png",
        RESOURCE_DIR / "splash-2732x2732.png",
    ]
    for target in splash_targets:
        ensure_parent(target)
        splash.save(target)


if __name__ == "__main__":
    main()
