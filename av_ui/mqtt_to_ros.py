import rospy
import paho.mqtt.client as mqtt
import json
import ssl
import yaml
import importlib
import os
from collections import defaultdict

class MQTTtoROSConverter:
    def __init__(self, config_file, broker_file, broker_name):
        with open(config_file, 'r') as file:
            self.config = yaml.safe_load(file)
        
        with open(broker_file, 'r') as file:
            broker_config = yaml.safe_load(file)
        
        broker_config = broker_config['Brokers'][broker_name]
        self.mqtt_host = broker_config['MQTT_SERVER']
        self.mqtt_port = broker_config['MQTT_PORT']
        self.mqtt_user = broker_config['MQTT_USER']
        self.mqtt_password = broker_config['MQTT_PASSWORD']
        
        rospy.init_node('mqtt_to_ros_converter', anonymous=True)
        self.mqtt_client = mqtt.Client()
        self.mqtt_client.username_pw_set(self.mqtt_user, self.mqtt_password)
        if broker_name != 'local':
            self.mqtt_client.tls_set(cert_reqs=ssl.CERT_REQUIRED, tls_version=ssl.PROTOCOL_TLSv1_2)
        self.mqtt_client.on_connect = self.on_connect
        self.mqtt_client.on_disconnect = self.on_disconnect
        self.mqtt_client.on_message = self.on_message

        self.publishers = {}
        self.message_types = {}
        self.fields_to_use = defaultdict(dict)

        self.setup_topics()

    def setup_topics(self):
        for topic_config in self.config['topics']:
            mqtt_topic = topic_config['mqtt_topic']
            ros_topic = topic_config['ros_topic']
            ros_type = topic_config['ros_type']
            compress_module = topic_config['compress_module']
            compress_flag = topic_config['compress']

            # Load the YAML file for the compression module
            yaml_file_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '../config', f"{compress_module}.yaml")
            with open(yaml_file_path, 'r') as file:
                compress_config = yaml.safe_load(file)
            
            message_type = compress_config['message_type']
            fields = compress_config['fields_compressed'] if compress_flag else compress_config['fields_full']

            # Import ROS message type
            ros_msg_type = self.import_ros_msg_type(ros_type)
            
            # Create publisher
            self.publishers[mqtt_topic] = rospy.Publisher(ros_topic, ros_msg_type, queue_size=10)
            self.message_types[mqtt_topic] = ros_msg_type
            self.fields_to_use[mqtt_topic] = fields

    def import_ros_msg_type(self, type_string):
        package, msg_name = type_string.split('/')
        module = importlib.import_module(f"{package}.msg")
        return getattr(module, msg_name)

    def on_connect(self, client, userdata, flags, rc):
        if rc == 0:
            rospy.loginfo("Connected to MQTT Broker!")
            for mqtt_topic in self.publishers.keys():
                client.subscribe(mqtt_topic)
                rospy.loginfo(f"Subscribed to MQTT topic: {mqtt_topic}")
        else:
            rospy.logerr(f"Failed to connect to MQTT Broker. Return code: {rc}")

    def on_disconnect(self, client, userdata, rc):
        rospy.logwarn(f"Disconnected from MQTT Broker with result code: {rc}")
        if rc != 0:
            rospy.loginfo("Attempting to reconnect...")
            try:
                client.reconnect()
            except Exception as e:
                rospy.logerr(f"Failed to reconnect: {e}")

    def on_message(self, client, userdata, msg):
        try:
            json_data = json.loads(msg.payload.decode())
            ros_msg = self.construct_ros_message(msg.topic, json_data)
            self.publishers[msg.topic].publish(ros_msg)
            rospy.loginfo(f"Published ROS message to {self.publishers[msg.topic].name}")
        except Exception as e:
            rospy.logerr(f"Error processing MQTT message: {e}")
            rospy.logerr(f"Payload: {msg.payload.decode()}")  # Log the payload for debugging

    def construct_ros_message(self, topic, data):
        msg = self.message_types[topic]()
        fields = self.fields_to_use[topic]

        for field in fields:
            value = self.get_field(data, field)
            self.set_field(msg, field, value)

        return msg

    def set_field(self, obj, field, value):
        parts = field.split('.')
        for part in parts[:-1]:
            if not hasattr(obj, part):
                setattr(obj, part, type(getattr(obj, part))())
            obj = getattr(obj, part)
        
        attr = getattr(type(obj), parts[-1])
        if hasattr(attr, '_type'):
            value = self.convert_value(value, attr._type)
        
        setattr(obj, parts[-1], value)

    def convert_value(self, value, ros_type):
        if value is None:
            return self.get_default_value(ros_type)
        
        try:
            if ros_type == 'string':
                return str(value)
            elif ros_type in ['float64', 'float32']:
                return float(value)
            elif ros_type in ['int64', 'int32', 'int16', 'int8', 'uint64', 'uint32', 'uint16', 'uint8']:
                return int(value)
            elif ros_type == 'bool':
                return bool(value)
            elif ros_type.endswith('[]'):
                return list(value)
            else:
                return value  # For complex types, return as is
        except (ValueError, TypeError):
            rospy.logwarn(f"Failed to convert value {value} to {ros_type}. Using default.")
            return self.get_default_value(ros_type)

    def get_default_value(self, ros_type):
        if ros_type == 'string':
            return ''
        elif ros_type in ['float64', 'float32']:
            return 0.0
        elif ros_type in ['int64', 'int32', 'int16', 'int8', 'uint64', 'uint32', 'uint16', 'uint8']:
            return 0
        elif ros_type == 'bool':
            return False
        elif ros_type.endswith('[]'):
            return []
        else:
            return None  # For complex types

    def get_field(self, data, field):
        parts = field.split('.')
        for part in parts:
            if isinstance(data, dict) and part in data:
                data = data[part]
            else:
                return None
        return data


    def run(self):
        try:
            self.mqtt_client.connect(self.mqtt_host, self.mqtt_port, keepalive=60)
            self.mqtt_client.loop_start()
            rospy.spin()
        except Exception as e:
            rospy.logerr(f"Error in MQTT to ROS converter: {e}")
        finally:
            self.mqtt_client.loop_stop()
            self.mqtt_client.disconnect()

if __name__ == "__main__":
    converter = MQTTtoROSConverter(
        '../config/mqtt_to_ros_config.yaml',
        '../config/mqtt_connection_config.yaml',
        'local'
    )
    converter.run()