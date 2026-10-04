"""Read audio tags and embedded covers for the static GitHub Pages player."""
import hashlib
import json
import subprocess
from pathlib import Path
from urllib.parse import quote

from mutagen import File

ROOT = Path(__file__).resolve().parent.parent
AUDIO = ROOT / 'audio'
EXTENSIONS = {'.mp3', '.m4a', '.ogg', '.opus', '.flac', '.wav', '.aac'}


def text_tag(tags, *names):
    for name in names:
        value = tags.get(name) if tags else None
        if value is not None:
            if hasattr(value, 'text'):
                value = value.text
            if isinstance(value, (list, tuple)):
                value = value[0] if value else ''
            if str(value).strip():
                return str(value).strip()
    return ''


def embedded_cover(media):
    tags = media.tags
    if tags and hasattr(tags, 'getall'):
        pictures = tags.getall('APIC')
        if pictures:
            picture = next((p for p in pictures if p.type == 3), pictures[0])
            return picture.data
    if getattr(media, 'pictures', None):
        return media.pictures[0].data
    if tags and tags.get('covr'):
        return bytes(tags['covr'][0])
    return None


def cover_extension(data):
    if data.startswith(b'\xff\xd8\xff'):
        return '.jpg'
    if data.startswith(b'\x89PNG\r\n\x1a\n'):
        return '.png'
    if data.startswith((b'GIF87a', b'GIF89a')):
        return '.gif'
    if data.startswith(b'RIFF') and data[8:12] == b'WEBP':
        return '.webp'
    return None


def commit_time(path):
    result = subprocess.run(['git', '-C', str(ROOT), 'log', '-1', '--format=%ct', '--', str(path.relative_to(ROOT))], capture_output=True, text=True)
    return int(result.stdout.strip()) if result.returncode == 0 and result.stdout.strip().isdigit() else int(path.stat().st_mtime)


def build_library(directory=AUDIO):
    tracks = []
    for path in directory.rglob('*'):
        if not path.is_file() or path.suffix.lower() not in EXTENSIONS:
            continue
        media = File(path)
        if media is None:
            raise ValueError(f'Unsupported audio file: {path.name}')
        digest = hashlib.sha256(path.read_bytes()).hexdigest()[:16]
        tags = media.tags
        title = text_tag(tags, 'TIT2', '\xa9nam', 'title') or path.stem
        artist = text_tag(tags, 'TPE1', '\xa9ART', 'artist')
        album = text_tag(tags, 'TALB', '\xa9alb', 'album')
        artwork = 'audio/default-cover.svg'
        cover = embedded_cover(media)
        extension = cover_extension(cover) if cover else None
        if extension:
            cover_name = hashlib.sha256(cover).hexdigest()[:16] + extension
            cover_path = directory / 'artwork' / cover_name
            cover_path.parent.mkdir(exist_ok=True)
            cover_path.write_bytes(cover)
            artwork = 'audio/artwork/' + cover_name
        tracks.append({
            'src': 'audio/' + quote(path.relative_to(directory).as_posix(), safe='/') + '?v=' + digest,
            'title': title, 'artist': artist, 'album': album,
            'artwork': artwork, 'duration': round(media.info.length, 2),
            'updated': commit_time(path) if directory == AUDIO else int(path.stat().st_mtime),
        })
    tracks.sort(key=lambda track: (-track['updated'], track['src']))
    return {'tracks': tracks}


if __name__ == '__main__':
    library = build_library()
    if not library['tracks']:
        raise SystemExit('No playable files found in audio/')
    (AUDIO / 'library.json').write_text(json.dumps(library, indent=2, ensure_ascii=False) + '\n')
    print(f"Indexed {len(library['tracks'])} audio track(s).")
