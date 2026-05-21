import os
from app.parsers.tree_sitter_parser import parse_python_code

IGNORE_DIRECTORIES = {
    ".git",
    "node_modules",
    "__pycache__",
    "venv"
}

SUPPORTED_EXTENSIONS = {
    ".py": "Python",
    ".js": "JavaScript",
    ".ts": "TypeScript",
    ".java": "Java",
    ".cpp": "C++",
    ".c": "C",
    ".go": "Go",
    ".rs": "Rust"
}


def scan_repository(repo_path: str):

    scanned_files = []

    for root, dirs, files in os.walk(repo_path):

        dirs[:] = [
            d for d in dirs
            if d not in IGNORE_DIRECTORIES
        ]

        for file in files:

            file_extension = os.path.splitext(file)[1]

            if file_extension in SUPPORTED_EXTENSIONS:

                full_path = os.path.join(root, file)

                file_data = {
                    "file_name": file,
                    "language": SUPPORTED_EXTENSIONS[file_extension],
                    "path": full_path
                }

                try:
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

    return scanned_files