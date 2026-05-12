#!/bin/bash
cd /mnt/d/SBAY
docker compose exec mongodb mongosh iotdb --eval 'db.users.deleteMany({phoneNumber: "0647096831", points: 2}); db.users.updateOne({phoneNumber: "0647096831"}, {$set: {role: "ADMIN"}});'
