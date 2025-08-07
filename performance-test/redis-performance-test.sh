#!/bin/bash

# Redis 캐싱 성능 테스트 스크립트
BASE_URL="http://localhost:8080"
RESULTS_FILE="redis-performance-results.txt"

echo "DDOBANG Redis 캐싱 성능 테스트 - $(date)" > $RESULTS_FILE
echo "========================================" >> $RESULTS_FILE

# Function to test endpoint with cache warming
test_endpoint_with_cache() {
    local endpoint=$1
    local name=$2
    echo "Testing $name..."
    echo >> $RESULTS_FILE
    echo "Test: $name" >> $RESULTS_FILE
    echo "Endpoint: $endpoint" >> $RESULTS_FILE
    
    # First request to warm up the cache
    echo "Cache warming..." >> $RESULTS_FILE
    warmup_time=$(curl -o /dev/null -s -w "%{time_total}\n" "$BASE_URL$endpoint" 2>/dev/null)
    echo "Cache warmup time: ${warmup_time}s" >> $RESULTS_FILE
    
    # Wait for cache to be populated
    sleep 1
    
    # Run 50 requests to test cached performance
    echo "Testing cached performance..." >> $RESULTS_FILE
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
        avg=$(echo "scale=6; $total / $count" | bc -l)
        
        sort -n temp_times.txt > sorted_times.txt
        p95_line=$(echo "($count * 95 + 50) / 100" | bc)
        p95=$(sed -n "${p95_line}p" sorted_times.txt)
        min=$(head -n1 sorted_times.txt)
        max=$(tail -n1 sorted_times.txt)
        
        echo "Cached Average: ${avg}s" >> $RESULTS_FILE
        echo "Cached Min: ${min}s" >> $RESULTS_FILE
        echo "Cached Max: ${max}s" >> $RESULTS_FILE
        echo "Cached 95th percentile: ${p95}s" >> $RESULTS_FILE
        echo "Total cached requests: $count" >> $RESULTS_FILE
        
        # Calculate improvement percentage
        if [ ! -z "$warmup_time" ] && [ ! -z "$avg" ]; then
            improvement=$(echo "scale=2; ($warmup_time - $avg) / $warmup_time * 100" | bc -l)
            echo "Performance improvement: ${improvement}%" >> $RESULTS_FILE
        fi
        
        rm temp_times.txt sorted_times.txt
    else
        echo "Failed to get cached response times" >> $RESULTS_FILE
    fi
}

# Wait for application to start
echo "Waiting for application to start..."
sleep 15

# Test cached endpoints
test_endpoint_with_cache "/api/v1/regions?majorRegion=서울" "Regions (Cached)"
test_endpoint_with_cache "/api/v1/themes?page=0&size=20" "Themes List (Cached)"
test_endpoint_with_cache "/api/v1/parties?page=0&size=20" "Parties List (Cached)"

echo >> $RESULTS_FILE
echo "Redis 캐싱 성능 테스트 완료 - $(date)" >> $RESULTS_FILE

echo "Redis 캐싱 성능 테스트 완료. 결과: $RESULTS_FILE"
cat $RESULTS_FILE