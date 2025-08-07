#!/bin/bash

# Simple Performance Test Script
BASE_URL="http://localhost:8080"
RESULTS_FILE="performance-results.txt"

echo "DDOBANG Performance Test Results - $(date)" > $RESULTS_FILE
echo "========================================" >> $RESULTS_FILE

# Function to test endpoint
test_endpoint() {
    local endpoint=$1
    local name=$2
    echo "Testing $name..." 
    echo >> $RESULTS_FILE
    echo "Test: $name" >> $RESULTS_FILE
    echo "Endpoint: $endpoint" >> $RESULTS_FILE
    
    # Run 50 requests with curl
    for i in {1..50}; do
        response_time=$(curl -o /dev/null -s -w "%{time_total}\n" "$BASE_URL$endpoint" 2>/dev/null)
        if [ $? -eq 0 ]; then
            echo "$response_time" >> temp_times.txt
        fi
    done
    
    if [ -f temp_times.txt ]; then
        # Calculate statistics
        total=$(awk '{sum+=$1} END {print sum}' temp_times.txt)
        count=$(wc -l < temp_times.txt)
        avg=$(echo "scale=3; $total / $count" | bc -l)
        
        sort -n temp_times.txt > sorted_times.txt
        p95_line=$(echo "($count * 95 + 50) / 100" | bc)
        p95=$(sed -n "${p95_line}p" sorted_times.txt)
        
        echo "Average: ${avg}s" >> $RESULTS_FILE
        echo "95th percentile: ${p95}s" >> $RESULTS_FILE
        echo "Total requests: $count" >> $RESULTS_FILE
        
        rm temp_times.txt sorted_times.txt
    else
        echo "Failed to get response times" >> $RESULTS_FILE
    fi
}

# Wait for application to start
echo "Waiting for application to start..."
sleep 10

# Test health endpoint
test_endpoint "/actuator/health" "Health Check"

# Test JWT token generation
test_endpoint "/api/v1/test/jwt" "JWT Token Generation"

# Test regions API
test_endpoint "/api/v1/regions" "Regions List"

# Test themes API  
test_endpoint "/api/v1/themes?page=0&size=20" "Themes List"

# Test parties API
test_endpoint "/api/v1/parties?page=0&size=20" "Parties List"

echo >> $RESULTS_FILE
echo "Performance test completed at $(date)" >> $RESULTS_FILE

echo "Performance test completed. Results saved to $RESULTS_FILE"
cat $RESULTS_FILE