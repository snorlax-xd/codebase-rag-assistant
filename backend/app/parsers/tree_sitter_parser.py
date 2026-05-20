from tree_sitter import Language, Parser
import tree_sitter_python as tspython


PYTHON_LANGUAGE = Language(tspython.language())

parser = Parser(PYTHON_LANGUAGE)


def parse_python_code(source_code: str):

    tree = parser.parse(bytes(source_code, "utf8"))

    root_node = tree.root_node

    parsed_data = {
        "functions": [],
        "classes": []
    }

    extract_nodes(root_node, source_code, parsed_data)

    return parsed_data


def extract_nodes(node, source_code, parsed_data):

    if node.type == "function_definition":

        function_name = node.child_by_field_name("name")

        function_code = source_code[
            node.start_byte:node.end_byte
        ]

        parsed_data["functions"].append({
            "type": "function",
            "name": source_code[
                function_name.start_byte:function_name.end_byte
            ],
            "content": function_code,
            "start_line": node.start_point[0] + 1,
            "end_line": node.end_point[0] + 1
        })

    elif node.type == "class_definition":

        class_name = node.child_by_field_name("name")

        class_code = source_code[
            node.start_byte:node.end_byte
        ]

        parsed_data["classes"].append({
            "type": "class",
            "name": source_code[
                class_name.start_byte:class_name.end_byte
            ],
            "content": class_code,
            "start_line": node.start_point[0] + 1,
            "end_line": node.end_point[0] + 1
        })

    for child in node.children:
        extract_nodes(child, source_code, parsed_data)