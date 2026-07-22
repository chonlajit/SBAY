import sys
import requests
import urllib.parse

def main():
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except AttributeError:
        pass

    if len(sys.argv) != 2:
        print("Usage: python promote.py <Email>")
        print("Example: python promote.py somchai@example.com")
        sys.exit(1)

    email = sys.argv[1]

    print(f"Promoting user with email '{email}' to ADMIN...")
    
    try:
        # Try localhost:8080 (Nginx) first, then fallback to backend port 8080 directly
        urls = [
            f"http://localhost:8080/api/auth/promote?email={urllib.parse.quote(email)}",
            f"http://localhost:80/api/auth/promote?email={urllib.parse.quote(email)}",
        ]
        response = None
        for url in urls:
            try:
                response = requests.get(url)
                if response.status_code != 404:
                    break
            except Exception:
                continue
        if response is None:
            print("Failed to reach promote endpoint.")
            sys.exit(1)

        if response.status_code == 200:
            data = response.json()
            if data.get("success"):
                print("Done! " + data.get("message", ""))
            else:
                print("Error: " + data.get("error", "Unknown error"))
        else:
            print(f"Server returned HTTP {response.status_code}")
            print(response.text)
            
    except Exception as e:
        print(f"Failed to connect to the backend server: {e}")
        print("Make sure the backend is running (python restart_app.py)")

if __name__ == "__main__":
    main()
