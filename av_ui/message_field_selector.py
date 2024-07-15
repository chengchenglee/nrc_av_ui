import tkinter as tk
from tkinter import ttk, filedialog
import yaml
import os

class MessageFieldSelector:
    def __init__(self, master):
        self.master = master
        master.title("Message Field Selector")
        master.geometry("600x400")

        self.message_types = {
            "DynamicPoseWithCovar": self.get_dynamic_pose_with_covar_fields(),
            "TrackedObjects": self.get_tracked_objects_fields()
        }

        self.setup_ui()

    def setup_ui(self):
        self.message_type_var = tk.StringVar()
        self.message_type_var.set("DynamicPoseWithCovar")
        self.message_type_var.trace("w", self.update_fields)

        ttk.Label(self.master, text="Select Message Type:").pack(pady=10)
        ttk.Combobox(self.master, textvariable=self.message_type_var, values=list(self.message_types.keys())).pack()

        self.fields_frame = ttk.Frame(self.master)
        self.fields_frame.pack(pady=10, expand=True, fill="both")

        ttk.Button(self.master, text="Generate Compression File", command=self.generate_file).pack(pady=10)

        self.update_fields()

    def update_fields(self, *args):
        for widget in self.fields_frame.winfo_children():
            widget.destroy()

        fields = self.message_types[self.message_type_var.get()]
        self.field_vars = {}

        for field in fields:
            var = tk.BooleanVar(value=True)
            self.field_vars[field] = var
            ttk.Checkbutton(self.fields_frame, text=field, variable=var).pack(anchor="w")

    def generate_file(self):
        selected_fields = [field for field, var in self.field_vars.items() if var.get()]
        
        content = self.generate_python_content(selected_fields)
        
        file_path = filedialog.asksaveasfilename(defaultextension=".py", filetypes=[("Python files", "*.py")])
        if file_path:
            with open(file_path, "w") as f:
                f.write(content)
            print(f"File saved: {file_path}")

    def generate_python_content(self, selected_fields):
        message_type = self.message_type_var.get()
        
        content = "import rospy\n\n"
        content += f"def compress_{message_type.lower()}(data):\n"
        content += "    return {\n"
        
        for field in selected_fields:
            if "." in field:
                parts = field.split(".")
                content += f"        '{parts[0]}': {{\n"
                for part in parts[1:-1]:
                    content += f"            '{part}': {{\n"
                content += f"            '{parts[-1]}': data.{field},\n"
                for _ in range(len(parts) - 1):
                    content += "        },\n"
            else:
                content += f"        '{field}': data.{field},\n"
        
        content += "    }\n\n"
        
        content += f"def full_{message_type.lower()}(data):\n"
        content += "    return {\n"
        
        all_fields = self.message_types[message_type]
        for field in all_fields:
            if "." in field:
                parts = field.split(".")
                content += f"        '{parts[0]}': {{\n"
                for part in parts[1:-1]:
                    content += f"            '{part}': {{\n"
                content += f"            '{parts[-1]}': data.{field},\n"
                for _ in range(len(parts) - 1):
                    content += "        },\n"
            else:
                content += f"        '{field}': data.{field},\n"
        
        content += "    }\n"
        
        return content

    def get_dynamic_pose_with_covar_fields(self):
        return [
            "header.seq", "header.stamp.secs", "header.stamp.nsecs", "header.frame_id",
            "status", "status_message",
            "pose.position.x", "pose.position.y", "pose.position.z",
            "pose.orientation.x", "pose.orientation.y", "pose.orientation.z", "pose.orientation.w",
            "twist.linear.x", "twist.linear.y", "twist.linear.z",
            "twist.angular.x", "twist.angular.y", "twist.angular.z",
            "accel.linear.x", "accel.linear.y", "accel.linear.z",
            "accel.angular.x", "accel.angular.y", "accel.angular.z",
            "sideslip", "curvature", "covariance", "covariance_mode"
        ]

    def get_tracked_objects_fields(self):
        return [
            "header.seq", "header.stamp.secs", "header.stamp.nsecs", "header.frame_id",
            "status", "status_message", "objects"
        ]

if __name__ == "__main__":
    root = tk.Tk()
    app = MessageFieldSelector(root)
    root.mainloop()