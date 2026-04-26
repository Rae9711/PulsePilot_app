#!/bin/bash
# FitForecast MVP - Master Startup Script
# This script sets up and starts the complete integrated MVP

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${BLUE}ℹ ${1}${NC}"
}

print_success() {
    echo -e "${GREEN}✅ ${1}${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  ${1}${NC}"
}

print_error() {
    echo -e "${RED}❌ ${1}${NC}"
}

print_header() {
    echo -e "\n${BLUE}═══════════════════════════════════════${NC}"
    echo -e "${BLUE}  ${1}${NC}"
    echo -e "${BLUE}═══════════════════════════════════════${NC}\n"
}

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if a port is available
port_available() {
    ! lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1
}

# Function to wait for a service
wait_for_service() {
    local url=$1
    local name=$2
    local max_attempts=30
    local attempt=0
    
    print_info "Waiting for ${name} to be ready..."
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -s "$url" >/dev/null 2>&1; then
            print_success "${name} is ready!"
            return 0
        fi
        attempt=$((attempt + 1))
        sleep 1
    done
    
    print_error "${name} failed to start"
    return 1
}

# Main script starts here
clear
echo -e "${GREEN}"
cat << "EOF"
  _____ _ _   _____                              _   
 |  ___(_) |_|  ___|__  _ __ ___  ___ __ _ ___| |_ 
 | |_  | | __| |_ / _ \| '__/ _ \/ __/ _` / __| __|
 |  _| | | |_|  _| (_) | | |  __/ (_| (_| \__ \ |_ 
 |_|   |_|\__|_|  \___/|_|  \___|\___\__,_|___/\__|
                                                    
          MVP Integration & Startup Script
EOF
echo -e "${NC}\n"

# Parse command line arguments
MODE=${1:-local}  # local, docker, or setup-only

print_header "FitForecast MVP Startup"

# Check prerequisites
print_info "Checking prerequisites..."

if ! command_exists node; then
    print_error "Node.js is not installed. Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi
print_success "Node.js $(node -v) detected"

if ! command_exists npm; then
    print_error "npm is not installed"
    exit 1
fi
print_success "npm $(npm -v) detected"

# Check Docker for docker mode or database
if [ "$MODE" = "docker" ] || [ "$MODE" = "local" ]; then
    if ! command_exists docker; then
        print_warning "Docker is not installed"
        if [ "$MODE" = "docker" ]; then
            print_error "Docker is required for Docker mode. Install from https://www.docker.com/products/docker-desktop"
            exit 1
        else
            print_warning "PostgreSQL must be running locally for local mode"
        fi
    else
        print_success "Docker detected"
    fi
fi

# Docker deployment mode
if [ "$MODE" = "docker" ]; then
    print_header "Starting with Docker Compose"
    
    print_info "Building and starting all services..."
    docker-compose up --build -d
    
    print_info "Waiting for services to be ready..."
    sleep 5
    
    if wait_for_service "http://localhost:3000/health" "Backend API"; then
        print_success "Backend is running at http://localhost:3000"
    fi
    
    if wait_for_service "http://localhost:5173" "Frontend"; then
        print_success "Frontend is running at http://localhost:5173"
    fi
    
    print_success "All services started successfully!"
    echo ""
    print_info "View logs: docker-compose logs -f"
    print_info "Stop services: docker-compose down"
    
    exit 0
fi

# Local development mode
if [ "$MODE" = "local" ] || [ "$MODE" = "setup-only" ]; then
    # Step 1: Start Database
    print_header "Step 1: Database Setup"
    
    if command_exists docker; then
        print_info "Starting PostgreSQL with Docker..."
        docker-compose -f docker-compose.dev.yml up -d
        
        print_info "Waiting for PostgreSQL to be ready..."
        sleep 5
        
        if docker-compose -f docker-compose.dev.yml ps | grep -q "Up"; then
            print_success "PostgreSQL is running"
        else
            print_error "Failed to start PostgreSQL"
            exit 1
        fi
    else
        print_warning "Docker not available. Assuming PostgreSQL is running locally..."
        print_info "Make sure PostgreSQL is running on localhost:5432"
    fi
    
    # Step 2: Backend Setup
    print_header "Step 2: Backend Setup"
    
    cd stream-1-backend
    
    # Create .env if it doesn't exist
    if [ ! -f .env ]; then
        print_info "Creating backend .env file..."
        cp .env.example .env
        print_success "Backend .env created"
    else
        print_info "Backend .env already exists"
    fi
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        print_info "Installing backend dependencies..."
        npm install
        print_success "Backend dependencies installed"
    else
        print_info "Backend dependencies already installed"
    fi
    
    # Generate Prisma client
    print_info "Generating Prisma client..."
    npm run prisma:generate
    print_success "Prisma client generated"
    
    # Run migrations
    print_info "Running database migrations..."
    npm run prisma:migrate
    print_success "Migrations completed"
    
    # Seed database
    print_info "Seeding database with sample data..."
    npm run seed
    print_success "Database seeded"
    
    cd ..
    
    # Step 3: Frontend Setup
    print_header "Step 3: Frontend Setup"
    
    cd stream-2-frontend
    
    # Create .env if it doesn't exist
    if [ ! -f .env ]; then
        print_info "Creating frontend .env file..."
        cp .env.example .env
        print_success "Frontend .env created"
    else
        print_info "Frontend .env already exists"
    fi
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        print_info "Installing frontend dependencies..."
        npm install
        print_success "Frontend dependencies installed"
    else
        print_info "Frontend dependencies already installed"
    fi
    
    cd ..
    
    if [ "$MODE" = "setup-only" ]; then
        print_header "Setup Complete!"
        echo ""
        print_success "All components are set up and ready to run"
        echo ""
        print_info "To start the backend:"
        echo -e "  ${YELLOW}cd stream-1-backend && npm run dev${NC}"
        echo ""
        print_info "To start the frontend (in a new terminal):"
        echo -e "  ${YELLOW}cd stream-2-frontend && npm run dev${NC}"
        echo ""
        print_info "Or run:"
        echo -e "  ${YELLOW}./start-mvp.sh local${NC}"
        echo ""
        exit 0
    fi
    
    # Step 4: Start Services
    print_header "Step 4: Starting Services"
    
    # Check if ports are available
    if ! port_available 3000; then
        print_error "Port 3000 is already in use. Please free it or stop the conflicting service."
        exit 1
    fi
    
    if ! port_available 5173; then
        print_error "Port 5173 is already in use. Please free it or stop the conflicting service."
        exit 1
    fi
    
    # Start backend in background
    print_info "Starting backend server..."
    cd stream-1-backend
    npm run dev > ../backend.log 2>&1 &
    BACKEND_PID=$!
    echo $BACKEND_PID > ../backend.pid
    cd ..
    
    # Wait for backend to be ready
    if wait_for_service "http://localhost:3000/health" "Backend API"; then
        print_success "Backend started (PID: $BACKEND_PID)"
        print_info "Logs: tail -f backend.log"
    else
        print_error "Backend failed to start. Check backend.log for errors"
        kill $BACKEND_PID 2>/dev/null || true
        exit 1
    fi
    
    # Start frontend in background
    print_info "Starting frontend server..."
    cd stream-2-frontend
    npm run dev > ../frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > ../frontend.pid
    cd ..
    
    # Wait for frontend to be ready
    sleep 3
    if wait_for_service "http://localhost:5173" "Frontend"; then
        print_success "Frontend started (PID: $FRONTEND_PID)"
        print_info "Logs: tail -f frontend.log"
    else
        print_error "Frontend failed to start. Check frontend.log for errors"
        kill $FRONTEND_PID 2>/dev/null || true
        exit 1
    fi
    
    # Success!
    print_header "🎉 MVP is Running!"
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                                        ║${NC}"
    echo -e "${GREEN}║  Frontend: http://localhost:5173      ║${NC}"
    echo -e "${GREEN}║  Backend:  http://localhost:3000      ║${NC}"
    echo -e "${GREEN}║  API Docs: http://localhost:3000/docs ║${NC}"
    echo -e "${GREEN}║                                        ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
    echo ""
    print_info "Default User ID: 00000000-0000-0000-0000-000000000001"
    echo ""
    print_info "Logs:"
    echo -e "  Backend:  ${YELLOW}tail -f backend.log${NC}"
    echo -e "  Frontend: ${YELLOW}tail -f frontend.log${NC}"
    echo ""
    print_info "To stop the services:"
    echo -e "  ${YELLOW}./stop-mvp.sh${NC}"
    echo -e "  or: ${YELLOW}kill $BACKEND_PID $FRONTEND_PID${NC}"
    echo ""
    print_warning "Press Ctrl+C to exit (services will continue running in background)"
    echo ""
    
    # Wait for user interrupt
    trap "echo ''; print_info 'Services are still running. Use ./stop-mvp.sh to stop them.'; exit 0" INT
    
    # Follow logs
    print_info "Following logs (Ctrl+C to exit)..."
    tail -f backend.log frontend.log
fi

# Help
if [ "$MODE" = "help" ] || [ "$MODE" = "--help" ] || [ "$MODE" = "-h" ]; then
    echo "FitForecast MVP Startup Script"
    echo ""
    echo "Usage: ./start-mvp.sh [MODE]"
    echo ""
    echo "Modes:"
    echo "  local       - Start database, backend, and frontend locally (default)"
    echo "  docker      - Start all services using Docker Compose"
    echo "  setup-only  - Set up environment but don't start services"
    echo "  help        - Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./start-mvp.sh              # Start locally"
    echo "  ./start-mvp.sh docker       # Start with Docker"
    echo "  ./start-mvp.sh setup-only   # Just set up, don't start"
    exit 0
fi

print_error "Unknown mode: $MODE"
echo "Use './start-mvp.sh help' for usage information"
exit 1
