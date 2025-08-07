#!/bin/bash

# Redis 캐싱 성능 테스트 스크립트
BASE_URL="http://localhost:8080"
RESULTS_FILE="cache-performance-results.txt"

echo "DDOBANG Redis 캐싱 성능 테스트 - $(date)" > $RESULTS_FILE
echo "========================================" >> $RESULTS_FILE

# Function to test endpoint with cache comparison
test_cache_performance() {
    local endpoint=$1
    local name=$2
    echo "Testing $name..."
    echo >> $RESULTS_FILE
    echo "=== $name ===" >> $RESULTS_FILE
    echo "Endpoint: $endpoint" >> $RESULTS_FILE
    
    # Test 1: Cold start (cache miss)
    echo "1. Cache Miss Test (Cold Start)" >> $RESULTS_FILE
    cold_time=$(curl -o /dev/null -s -w "%{time_total}\n" "$BASE_URL$endpoint" 2>/dev/null)
    echo "Cold start time: ${cold_time}s" >> $RESULTS_FILE
    
    # Wait a moment for cache to be populated
    sleep 1
    
    # Test 2: Warm cache (cache hit)
    echo "2. Cache Hit Test (Multiple Requests)" >> $RESULTS_FILE
    
    # Run 20 requests to test cached performance
    for i in {1..20}; do
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
        min=$(head -n1 sorted_times.txt)
        max=$(tail -n1 sorted_times.txt)
        
        echo "Cached requests: $count" >> $RESULTS_FILE
        echo "Cached average: ${avg}s" >> $RESULTS_FILE
        echo "Cached min: ${min}s" >> $RESULTS_FILE
        echo "Cached max: ${max}s" >> $RESULTS_FILE
        
        # Calculate improvement
        if [ ! -z "$cold_time" ] && [ ! -z "$avg" ]; then
            improvement=$(echo "scale=2; ($cold_time - $avg) / $cold_time * 100" | bc -l)
            absolute_improvement=$(echo "scale=6; $cold_time - $avg" | bc -l)
            echo "Performance improvement: ${improvement}%" >> $RESULTS_FILE
            echo "Absolute improvement: ${absolute_improvement}s" >> $RESULTS_FILE
        fi
        
        rm temp_times.txt sorted_times.txt
    else
        echo "Failed to get cached response times" >> $RESULTS_FILE
    fi
    
    echo >> $RESULTS_FILE
}

# Test JWT generation for comparison (no caching)
test_cache_performance "/api/v1/test/jwt" "JWT Token Generation (No Cache)"

# Test regions API (with caching)
test_cache_performance "/api/v1/regions?majorRegion=%EC%84%9C%EC%9A%B8" "Regions API (With Cache)"

echo "Redis 캐싱 성능 테스트 완료 - $(date)" >> $RESULTS_FILE

echo "Redis 캐싱 성능 테스트 완료. 결과 확인:"
cat $RESULTS_FILE