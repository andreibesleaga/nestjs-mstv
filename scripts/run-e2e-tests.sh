#!/bin/bash

# Docker E2E Test Runner Script
# This script sets up and runs comprehensive E2E tests using Docker

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting NestJS MSTV E2E Test Suite${NC}"

# Function to clean up on exit
cleanup() {
    echo -e "${YELLOW}🧹 Cleaning up Docker containers...${NC}"
    docker-compose -f docker/docker-compose.test.yml down -v || true
    docker-compose -f docker/docker-compose.full.yml down -v || true
}

# Set trap to cleanup on script exit
trap cleanup EXIT

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker and try again.${NC}"
    exit 1
fi

# Parse command line arguments
TEST_TYPE="all"
SKIP_BUILD=false
PARALLEL=false
VERBOSE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --type)
            TEST_TYPE="$2"
            shift 2
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --parallel)
            PARALLEL=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --type TYPE        Test type: unit, integration, e2e, performance, all (default: all)"
            echo "  --skip-build       Skip Docker image build"
            echo "  --parallel         Run tests in parallel where possible"
            echo "  --verbose          Enable verbose output"
            echo "  --help             Show this help message"
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# Set verbose flag for Docker commands
DOCKER_VERBOSE=""
if [ "$VERBOSE" = true ]; then
    DOCKER_VERBOSE="--verbose"
fi

echo -e "${BLUE}📋 Test Configuration:${NC}"
echo -e "  Test Type: ${GREEN}$TEST_TYPE${NC}"
echo -e "  Skip Build: ${GREEN}$SKIP_BUILD${NC}"
echo -e "  Parallel: ${GREEN}$PARALLEL${NC}"
echo -e "  Verbose: ${GREEN}$VERBOSE${NC}"
echo ""

# Function to run specific test type
run_test_type() {
    local type=$1
    local description=$2
    local command=$3
    
    echo -e "${BLUE}🧪 Running $description...${NC}"
    
    if [ "$VERBOSE" = true ]; then
        echo -e "${YELLOW}Command: $command${NC}"
    fi
    
    if eval "$command"; then
        echo -e "${GREEN}✅ $description completed successfully${NC}"
        return 0
    else
        echo -e "${RED}❌ $description failed${NC}"
        return 1
    fi
}

# Build Docker images if not skipped
if [ "$SKIP_BUILD" != true ]; then
    echo -e "${BLUE}🔨 Building Docker images...${NC}"
    docker-compose -f docker/docker-compose.test.yml build $DOCKER_VERBOSE
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Docker images built successfully${NC}"
    else
        echo -e "${RED}❌ Failed to build Docker images${NC}"
        exit 1
    fi
fi

# Start test infrastructure
echo -e "${BLUE}🚀 Starting test infrastructure...${NC}"
docker-compose -f docker/docker-compose.test.yml up -d db-test redis-test

# Wait for services to be healthy
echo -e "${YELLOW}⏳ Waiting for services to be healthy...${NC}"
timeout=60
elapsed=0
while [ $elapsed -lt $timeout ]; do
    if docker-compose -f docker/docker-compose.test.yml ps | grep -q "healthy"; then
        echo -e "${GREEN}✅ Services are healthy${NC}"
        break
    fi
    sleep 2
    elapsed=$((elapsed + 2))
    echo -n "."
done

if [ $elapsed -ge $timeout ]; then
    echo -e "${RED}❌ Services failed to start within $timeout seconds${NC}"
    exit 1
fi

# Run tests based on type
case $TEST_TYPE in
    "unit")
        run_test_type "unit" "Unit Tests" "docker-compose -f docker/docker-compose.test.yml run --rm app-test pnpm test:unit"
        ;;
    "integration")
        run_test_type "integration" "Integration Tests" "docker-compose -f docker/docker-compose.test.yml run --rm app-test pnpm test:integration"
        ;;
    "e2e")
        run_test_type "e2e" "E2E Tests" "docker-compose -f docker/docker-compose.test.yml run --rm app-test pnpm test:e2e"
        ;;
    "performance")
        run_test_type "performance" "Performance Tests" "docker-compose -f docker/docker-compose.test.yml run --rm app-test pnpm test:performance"
        ;;
    "full")
        run_test_type "full" "Full E2E Tests" "docker-compose -f docker/docker-compose.test.yml run --rm app-test pnpm test:e2e:full"
        ;;
    "all")
        echo -e "${BLUE}🎯 Running complete test suite...${NC}"
        
        FAILED_TESTS=()
        
        if [ "$PARALLEL" = true ]; then
            echo -e "${YELLOW}🔄 Running tests in parallel...${NC}"
            
            # Run unit and integration tests in parallel
            run_test_type "unit" "Unit Tests" "docker-compose -f docker/docker-compose.test.yml run --rm app-test pnpm test:unit" &
            UNIT_PID=$!
            
            run_test_type "integration" "Integration Tests" "docker-compose -f docker/docker-compose.test.yml run --rm app-test pnpm test:integration" &
            INTEGRATION_PID=$!
            
            # Wait for parallel tests
            wait $UNIT_PID || FAILED_TESTS+=("unit")
            wait $INTEGRATION_PID || FAILED_TESTS+=("integration")
            
            # Run E2E tests sequentially (they need more resources)
            run_test_type "e2e" "E2E Tests" "docker-compose -f docker/docker-compose.test.yml run --rm app-test pnpm test:e2e" || FAILED_TESTS+=("e2e")
            run_test_type "performance" "Performance Tests" "docker-compose -f docker/docker-compose.test.yml run --rm app-test pnpm test:performance" || FAILED_TESTS+=("performance")
        else
            echo -e "${YELLOW}🔄 Running tests sequentially...${NC}"
            
            run_test_type "unit" "Unit Tests" "docker-compose -f docker/docker-compose.test.yml run --rm app-test pnpm test:unit" || FAILED_TESTS+=("unit")
            run_test_type "integration" "Integration Tests" "docker-compose -f docker/docker-compose.test.yml run --rm app-test pnpm test:integration" || FAILED_TESTS+=("integration")
            run_test_type "e2e" "E2E Tests" "docker-compose -f docker/docker-compose.test.yml run --rm app-test pnpm test:e2e" || FAILED_TESTS+=("e2e")
            run_test_type "performance" "Performance Tests" "docker-compose -f docker/docker-compose.test.yml run --rm app-test pnpm test:performance" || FAILED_TESTS+=("performance")
        fi
        
        # Report results
        if [ ${#FAILED_TESTS[@]} -eq 0 ]; then
            echo -e "${GREEN}🎉 All tests passed successfully!${NC}"
        else
            echo -e "${RED}❌ The following test suites failed: ${FAILED_TESTS[*]}${NC}"
            exit 1
        fi
        ;;
    *)
        echo -e "${RED}❌ Unknown test type: $TEST_TYPE${NC}"
        echo "Valid types: unit, integration, e2e, performance, full, all"
        exit 1
        ;;
esac

echo -e "${GREEN}🎉 Test execution completed!${NC}"
