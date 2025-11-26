#!/bin/bash
# Force deployment script

echo "Forcing deployment update..."

# Create a timestamp file to force changes
echo "Last updated: $(date)" > deployment-timestamp.txt

# Add and commit the timestamp
git add deployment-timestamp.txt
git commit -m "Force deployment update - $(date)"

# Push to trigger deployment
git push origin main

echo "Deployment triggered!"
