# Promote a user to ADMIN by Phone Number
param(
    [string]$PhoneNumber
)

if ([string]::IsNullOrWhiteSpace($PhoneNumber)) {
    Write-Host "Usage: .\promote_admin.ps1 <PhoneNumber>" -ForegroundColor Red
    exit
}

Write-Host "Promoting User with Phone: $PhoneNumber to ADMIN..." -ForegroundColor Yellow

# Execute MongoDB Update Command inside Docker
# DB Name: iotdb
# Collection: user (default class name lowercase) or users? Spring Data usually uses class name or plural. 
# Let's try 'user' first. If it fails, user might need to check collection name.
# Default Spring Data MongoDB collection name for User class is "user" (lowercase class name).

$cmd = "db.users.updateOne({phoneNumber: '$PhoneNumber'}, {`$set: {role: 'ADMIN'}})"

mongosh iotdb --eval "$cmd"

Write-Host "Done! Please try logging in again." -ForegroundColor Green
