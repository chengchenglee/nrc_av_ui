import tkinter as tk
from tkinter import ttk, filedialog
import os
import re
import yaml

DEFAULT_MSG_PATH = "/home/users/jshah/projects/fvla-base/nrc_ws/src/nrc_msgs/msg"

def parse_msg_file(file_content):
    lines = file_content.split('\n')
    fields = []
    current_struct = ""
    
    for line in lines:
        line = line.strip()
        if line.startswith('#') or not line:
            continue
        
        if line.startswith('Header header'):
            fields.extend(["header.seq", "header.stamp.secs", "header.stamp.nsecs", "header.frame_id"])
        elif '=' in line:
            continue
        elif line.endswith('{'):
            current_struct = line.split()[0] + '.'
        elif line == '}':
            current_struct = ""
        else:
            parts = line.split()
            if len(parts) >= 2:
                field_type, field_name = parts[0], parts[1]
                if '[' in field_name:
                    field_name = field_name.split('[')[0]
                    fields.append(f"{current_struct}{field_name}")
                elif field_type in ['float32', 'float64', 'int8', 'int16', 'int32', 'int64', 'uint8', 'uint16', 'uint32', 'uint64', 'string', 'bool']:
                    fields.append(f"{current_struct}{field_name}")
                elif field_type in ['geometry_msgs/Pose', 'geometry_msgs/Twist']:
                    if field_type == 'geometry_msgs/Pose':
                        fields.extend([
                            f"{current_struct}{field_name}.position.x",
                            f"{current_struct}{field_name}.position.y",
                            f"{current_struct}{field_name}.position.z",
                            f"{current_struct}{field_name}.orientation.x",
                            f"{current_struct}{field_name}.orientation.y",
                            f"{current_struct}{field_name}.orientation.z",
                            f"{current_struct}{field_name}.orientation.w"
                        ])
                    elif field_type == 'geometry_msgs/Twist':
                        fields.extend([
                            f"{current_struct}{field_name}.linear.x",
                            f"{current_struct}{field_name}.linear.y",
                            f"{current_struct}{field_name}.linear.z",
                            f"{current_struct}{field_name}.angular.x",
                            f"{current_struct}{field_name}.angular.y",
                            f"{current_struct}{field_name}.angular.z"
                        ])
                else:
                    fields.append(f"{current_struct}{field_name}")
    
    return fields

class MessageFieldSelector:
    def __init__(self, master):
        self.master = master
        master.title("Message Field Selector")
        master.geometry("600x400")

        self.message_types = {}
        self.setup_ui()

    def setup_ui(self):
        ttk.Button(self.master, text="Load MSG File", command=self.load_msg_file).pack(pady=10)

        self.message_type_var = tk.StringVar()
        self.message_type_combobox = ttk.Combobox(self.master, textvariable=self.message_type_var, state="disabled")
        self.message_type_combobox.pack()
        self.message_type_var.trace("w", self.update_fields)

        self.fields_frame = ttk.Frame(self.master)
        self.fields_frame.pack(pady=10, expand=True, fill="both")

        ttk.Button(self.master, text="Generate YAML File", command=self.generate_file).pack(pady=10)

    def load_msg_file(self):
        file_path = filedialog.askopenfilename(
            initialdir=DEFAULT_MSG_PATH,
            filetypes=[("MSG files", "*.msg")]
        )
        if file_path:
            with open(file_path, 'r') as file:
                content = file.read()
            
            fields = parse_msg_file(content)
            message_type = os.path.basename(file_path).split('.')[0]
            
            self.message_types[message_type] = fields
            self.message_type_combobox['values'] = list(self.message_types.keys())
            self.message_type_combobox['state'] = 'readonly'
            self.message_type_var.set(message_type)
            
            self.update_fields()

    def update_fields(self, *args):
        for widget in self.fields_frame.winfo_children():
            widget.destroy()

        if self.message_type_var.get():
            fields = self.message_types[self.message_type_var.get()]
            self.field_vars_compressed = {}

            for field in fields:
                var = tk.BooleanVar(value=True)
                self.field_vars_compressed[field] = var
                ttk.Checkbutton(self.fields_frame, text=field, variable=var).pack(anchor="w")

    def generate_file(self):
        if not self.message_type_var.get():
            print("Please load a MSG file first.")
            return

        selected_fields_compressed = [field for field, var in self.field_vars_compressed.items() if var.get()]
        all_fields_full = list(self.message_types[self.message_type_var.get()])
        
        content = self.generate_yaml_content(selected_fields_compressed, all_fields_full)
        
        file_path = filedialog.asksaveasfilename(defaultextension=".yaml", filetypes=[("YAML files", "*.yaml")])
        if file_path:
            with open(file_path, "w") as f:
                yaml.dump(content, f)
            print(f"File saved: {file_path}")

    def generate_yaml_content(self, fields_compressed, fields_full):
        message_type = self.message_type_var.get()
        
        return {
            'message_type': message_type,
            'fields_compressed': fields_compressed,
            'fields_full': fields_full
        }

if __name__ == "__main__":
    root = tk.Tk()
    app = MessageFieldSelector(root)
    root.mainloop()
