import os
from pathlib import Path
from app.parsers.tree_sitter_parser import parse_python_code
from app.config import get_settings


settings = get_settings()
IGNORE_DIRECTORIES = settings.ignore_directories
MAX_TEXT_FILE_BYTES = settings.max_text_file_bytes

SUPPORTED_EXTENSIONS = {
    ".py": "Python",
    ".js": "JavaScript",
    ".jsx": "JavaScript",
    ".mjs": "JavaScript",
    ".cjs": "JavaScript",
    ".ts": "TypeScript",
    ".tsx": "TypeScript",
    ".java": "Java",
    ".cpp": "C++",
    ".c": "C",
    ".h": "C/C++ Header",
    ".hpp": "C++ Header",
    ".go": "Go",
    ".rs": "Rust",
    ".html": "HTML",
    ".css": "CSS",
    ".scss": "SCSS",
    ".json": "JSON",
    ".md": "Markdown",
    ".yml": "YAML",
    ".yaml": "YAML",
    ".toml": "TOML",
    ".xml": "XML",
    ".gradle": "Gradle",
    ".kt": "Kotlin"
}


def scan_repository(repo_path: str):

    scanned_files = []
    repo_root = Path(repo_path).resolve()

    for root, dirs, files in os.walk(repo_path):

        dirs[:] = [
            d for d in dirs
            if d not in IGNORE_DIRECTORIES
        ]

        for file in files:

            file_extension = os.path.splitext(file)[1]

            if file_extension in SUPPORTED_EXTENSIONS:

                full_path = os.path.join(root, file)
                relative_path = str(
                    Path(full_path).resolve().relative_to(repo_root)
                )

                file_data = {
                    "file_name": file,
                    "language": SUPPORTED_EXTENSIONS[file_extension],
                    "path": relative_path
                }

                try:
                    if os.path.getsize(full_path) > MAX_TEXT_FILE_BYTES:
                        file_data["parsed"] = {
                            "functions": [],
                            "classes": []
                        }
                        scanned_files.append(file_data)
                        continue

                    with open(full_path, "r", encoding="utf-8") as source_file:
                        source_code = source_file.read()
                    file_data["content"] = source_code
                    
                    if file_extension == ".py":
                        # Deep parse: extract individual functions and classes
                        parsed_output = parse_python_code(source_code)
                        file_data["parsed"] = parsed_output

                    else:
                        # For all other languages: store the raw file content
                        # as a single chunk so it gets embedded and indexed
                        file_data["parsed"] = {
                            "functions": [
                                {
                                    "type": "raw",
                                    "name": file,
                                    "content": source_code,
                                    "start_line": 1,
                                    "end_line": source_code.count("\n") + 1
                                }
                            ],
                            "classes": []
                        }

                except UnicodeDecodeError:
                    # Binary or non-UTF-8 file — skip silently
                    file_data["parsed"] = {
                        "functions": [],
                        "classes": []
                    }

                except Exception as error:
                    file_data["parsed"] = {
                        "error": str(error),
                        "functions": [],
                        "classes": []
                    }

                scanned_files.append(file_data)
                if len(scanned_files) >= settings.max_scan_files:
                    return scanned_files

    return scanned_files
