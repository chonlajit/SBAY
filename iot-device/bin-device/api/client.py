import requests

class APIClient:

    def __init__(self, base_url):
        self.base_url = base_url

    def send_transaction(self, data):
        try:
            requests.post(
                f"{self.base_url}/api/transaction",
                json=data,
                timeout=3
            )
        except:
            print("Send failed → เก็บ offline")