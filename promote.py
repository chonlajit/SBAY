import sys
import requests
import urllib.parse

def main():
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except AttributeError:
        pass

    if len(sys.argv) != 3:
        print("Usage: python promote.py <FirstName> <LastName>")
        print("Example: python promote.py ชลสิทธิ์ จิตมาตย์")
        sys.exit(1)

    first = sys.argv[1]
    last = sys.argv[2]

    print(f"Promoting user '{first} {last}' to ADMIN...")
    
    try:
        # Use the bypass API instead of Docker CLI to avoid Windows pipe issues
        url = f"http://localhost:8070/api/auth/promote?firstName={urllib.parse.quote(first)}&lastName={urllib.parse.quote(last)}"
        response = requests.get(url)
        
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
