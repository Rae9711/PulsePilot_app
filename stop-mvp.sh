#!/bin/bash
# FitForecast MVP - Stop Script
# This script stops all running FitForecast services

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_info() {
    echo -e "${BLUE}ℹ ${1}${NC}"
}

print_success() {
    echo -e "${GREEN}✅ ${1}${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  ${1}${NC}"
}

echo -e "\n${BLUE}════════════════════════════════${NC}"
echo -e "${BLUE}  Stopping FitForecast MVP${NC}"
echo -e "${BLUE}════════════════════════════════${NC}\n"

# Check if Docker Compose services are running
if docker-compose ps 2>/dev/null | grep -q "Up"; then
    print_info "Stopping Docker Compose services..."
    docker-compose down
    print_success "Docker Compose services stopped"
fi

if docker-compose -f docker-compose.dev.yml ps 2>/dev/null | grep -q "Up"; then
    print_info "Stopping development database..."
    docker-compose -f docker-compose.dev.yml down
    print_success "Development database stopped"
fi

# Stop local services using PID files
if [ -f backend.pid ]; then
    BACKEND_PID=$(cat backend.pid)
    if ps -p $BACKEND_PID > /dev/null 2>&1; then
        print_info "Stopping backend (PID: $BACKEND_PID)..."
        kill $BACKEND_PID
        print_success "Backend stopped"
    fi
    rm backend.pid
fi

if [ -f frontend.pid ]; then
    FRONTEND_PID=$(cat frontend.pid)
    if ps -p $FRONTEND_PID > /dev/null 2>&1; then
        print_info "Stopping frontend (PID: $FRONTEND_PID)..."
        kill $FRONTEND_PID
        print_success "Frontend stopped"
    fi
    rm frontend.pid
fi

# Kill any remaining Node processes on the ports
print_info "Checking for processes on ports 3000 and 5173..."

if lsof -ti:3000 >/dev/null 2>&1; then
    print_warning "Killing process on port 3000..."
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
fi

if lsof -ti:5173 >/dev/null 2>&1; then
    print_warning "Killing process on port 5173..."
    lsof -ti:5173 | xargs kill -9 2>/dev/null || true
fi

echo ""
print_success "All FitForecast services stopped"
echo ""
print_info "To start again: ./start-mvp.sh"
echo ""
