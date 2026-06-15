import sys

with open('patch_ui.py', 'r', encoding='utf-8') as f:
    code = f.read()

code = code.replace("'r')", "'r', encoding='utf-8')")
code = code.replace("'w')", "'w', encoding='utf-8')")
code = code.replace("except Exception as e:\n    pass", "except Exception as e:\n    import traceback\n    traceback.print_exc()")

with open('patch_ui_fixed.py', 'w', encoding='utf-8') as f:
    f.write(code)
