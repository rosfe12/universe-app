from pathlib import Path

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[1]
ICON_SOURCE = ROOT / "public" / "icons" / "icon-512.png"
ANDROID_RES = ROOT / "android" / "app" / "src" / "main" / "res"
RESOURCE_DIR = ROOT / "resources" / "android"
BACKGROUND = "#0F172A"

ICON_SIZES = {
    "mdpi": 48,
    "hdpi": 72,
    "xhdpi": 96,
    "xxhdpi": 144,
    "xxxhdpi": 192,
}

FOREGROUND_SIZES = {
    "mdpi": 108,
    "hdpi": 162,
    "xhdpi": 216,
    "xxhdpi": 324,
    "xxxhdpi": 432,
}

SPLASH_SIZES = {
    "drawable": (480, 320),
    "drawable-land-mdpi": (480, 320),
    "drawable-land-hdpi": (800, 480),
    "drawable-land-xhdpi": (1280, 720),
    "drawable-land-xxhdpi": (1600, 960),
    "drawable-land-xxxhdpi": (1920, 1280),
    "drawable-port-mdpi": (320, 480),
    "drawable-port-hdpi": (480, 800),
    "drawable-port-xhdpi": (720, 1280),
    "drawable-port-xxhdpi": (960, 1600),
    "drawable-port-xxxhdpi": (1280, 1920),
}


def ensure_parent(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)


def save_launcher_icons(icon: Image.Image) -> None:
    for density, size in ICON_SIZES.items():
        target_dir = ANDROID_RES / f"mipmap-{density}"
        for name in ("ic_launcher.png", "ic_launcher_round.png"):
            target = target_dir / name
            ensure_parent(target)
            ImageOps.fit(icon, (size, size), Image.Resampling.LANCZOS).save(target)


def save_foreground_icons(icon: Image.Image) -> None:
    for density, size in FOREGROUND_SIZES.items():
        target = ANDROID_RES / f"mipmap-{density}" / "ic_launcher_foreground.png"
        ensure_parent(target)

        canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        inset = int(size * 0.16)
        safe_icon = ImageOps.contain(
            icon,
            (size - inset * 2, size - inset * 2),
            Image.Resampling.LANCZOS,
        )
        x = (size - safe_icon.width) // 2
        y = (size - safe_icon.height) // 2
        canvas.alpha_composite(safe_icon, (x, y))
        canvas.save(target)


def build_splash(icon: Image.Image, size: tuple[int, int]) -> Image.Image:
    canvas = Image.new("RGBA", size, BACKGROUND)
    icon_max = int(min(size) * 0.42)
    safe_icon = ImageOps.contain(icon, (icon_max, icon_max), Image.Resampling.LANCZOS)
    x = (size[0] - safe_icon.width) // 2
    y = (size[1] - safe_icon.height) // 2
    canvas.alpha_composite(safe_icon, (x, y))
    return canvas


def save_splashes(icon: Image.Image) -> None:
    for resource_dir, size in SPLASH_SIZES.items():
        target = ANDROID_RES / resource_dir / "splash.png"
        ensure_parent(target)
        build_splash(icon, size).save(target)


def main() -> None:
    icon = Image.open(ICON_SOURCE).convert("RGBA")

    save_launcher_icons(icon)
    save_foreground_icons(icon)
    save_splashes(icon)

    RESOURCE_DIR.mkdir(parents=True, exist_ok=True)
    ImageOps.fit(icon, (512, 512), Image.Resampling.LANCZOS).save(RESOURCE_DIR / "app-icon-512.png")
    build_splash(icon, (1440, 2560)).save(RESOURCE_DIR / "splash-android-1440x2560.png")


if __name__ == "__main__":
    main()
