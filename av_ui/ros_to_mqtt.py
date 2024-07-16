import rospy
import paho.mqtt.client as mqtt
import json
import threading
import ssl
import yaml
import importlib

class ROStoMQTTConverter:
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
        
        rospy.init_node('ros_to_mqtt_converter', anonymous=True)
        self.mqtt_client = mqtt.Client()
        self.mqtt_client.username_pw_set(self.mqtt_user, self.mqtt_password)
        if not broker_name == 'local':
            self.mqtt_client.tls_set(cert_reqs=ssl.CERT_REQUIRED, tls_version=ssl.PROTOCOL_TLSv1_2)
        self.mqtt_client.on_connect = self.on_connect
        self.mqtt_client.on_disconnect = self.on_disconnect
        self.mqtt_client.on_publish = self.on_publish

        try:
            self.mqtt_client.connect(self.mqtt_host, self.mqtt_port, keepalive=60)
            self.mqtt_client.loop_start()
        except Exception as e:
            rospy.logerr(f"Failed to connect to MQTT broker: {e}")
        
        self.subscribers = []
        self.message_buffers = {}
        self.buffer_locks = {}

        self.setup_topics()

        self.mqtt_thread = threading.Thread(target=self.publish_to_mqtt)
        self.mqtt_thread.daemon = True
        self.mqtt_thread.start()
    
    def setup_topics(self):
        for topic_config in self.config['topics']:
            ros_topic = topic_config['ros_topic']
            ros_type = topic_config['ros_type']
            mqtt_topic = topic_config['mqtt_topic']
            compress_module = topic_config['compress_module']
            rate = topic_config['rate']
            compress_flag = topic_config['compress']

            # Dynamically import the compression module
            module = importlib.import_module(compress_module)
            message_type = ros_type.split('/')[-1].lower()
            compress_func_name = f"compress_{message_type}"
            full_func_name = f"full_{message_type}"
            compress_func = getattr(module, compress_func_name)
            full_func = getattr(module, full_func_name)

            # Create message buffer and lock for this topic
            self.message_buffers[ros_topic] = []
            self.buffer_locks[ros_topic] = threading.Lock()

            # Create a closure to capture topic-specific variables
            def callback_factory(topic, compress_flag, compress_func, full_func):
                def callback(data):
                    with self.buffer_locks[topic]:
                        message_dict = compress_func(data) if compress_flag else full_func(data)
                        self.message_buffers[topic].append((mqtt_topic, message_dict))
                return callback

            # Create subscriber with the generated callback
            ros_msg_type = self.import_ros_msg_type(ros_type)
            subscriber = rospy.Subscriber(
                ros_topic,
                ros_msg_type,
                callback_factory(ros_topic, compress_flag, compress_func, full_func)
            )
            self.subscribers.append(subscriber)

    def import_ros_msg_type(self, type_string):
        # Split the type string into package and message name
        package, msg_name = type_string.split('/')
        module = importlib.import_module(f"{package}.msg")
        return getattr(module, msg_name)

    def on_connect(self, client, userdata, flags, rc):
        if rc == 0:
            rospy.loginfo("Connected to MQTT Broker!")
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

    def on_publish(self, client, userdata, mid):
        rospy.logdebug(f"Message {mid} published successfully")

    def publish_to_mqtt(self):
        topic_rates = {topic_config['ros_topic']: rospy.Rate(topic_config['rate']) for topic_config in self.config['topics']}
        
        while not rospy.is_shutdown():
            for topic_config in self.config['topics']:
                ros_topic = topic_config['ros_topic']
                mqtt_topic = topic_config['mqtt_topic']
                
                with self.buffer_locks[ros_topic]:
                    if self.message_buffers[ros_topic]:
                        message = self.message_buffers[ros_topic].pop(0)
                        json_message = json.dumps(message[1])
                        try:
                            result = self.mqtt_client.publish(mqtt_topic, json_message, qos=1)
                            if result.rc == mqtt.MQTT_ERR_SUCCESS:
                                rospy.loginfo(f"Published message to {mqtt_topic}")
                            else:
                                rospy.logerr(f"Failed to publish message. Error code: {result.rc}")
                        except Exception as e:
                            rospy.logerr(f"Error publishing message: {e}")
                
                topic_rates[ros_topic].sleep()
    
    def run(self):
        rospy.spin()

if __name__ == "__main__":
    converter = ROStoMQTTConverter(
        '../config/ros_to_mqtt_config.yaml',
        '../config/mqtt_connection_config.yaml',
        'local'
    )
    converter.run()
