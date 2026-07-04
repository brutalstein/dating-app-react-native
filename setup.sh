#!/bin/bash

# Bloom App - Production Setup Script
# This script helps set up the application for production deployment

set -e

echo "=========================================="
echo "  Bloom App - Production Setup"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}Creating .env file from .env.example...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✓ .env file created${NC}"
    echo ""
    echo -e "${YELLOW}IMPORTANT: You must edit the .env file and set:${NC}"
    echo "  - JWT_SECRET (generate with: openssl rand -base64 64)"
    echo "  - DB_PASSWORD (use a strong password)"
    echo "  - MAIL_USERNAME and MAIL_PASSWORD (for email verification)"
    echo "  - CORS_ALLOWED_ORIGINS (your production domains)"
    echo ""
else
    echo -e "${GREEN}✓ .env file already exists${NC}"
fi

# Generate JWT secret if not set
if grep -q "JWT_SECRET=ChangeThisToASecureRandomSecretInProductionMinimum32CharactersLong" .env 2>/dev/null || \
   ! grep -q "^JWT_SECRET=" .env 2>/dev/null; then
    echo -e "${YELLOW}Generating secure JWT_SECRET...${NC}"
    JWT_SECRET=$(openssl rand -base64 64)
    
    # Update .env file
    if grep -q "^JWT_SECRET=" .env 2>/dev/null; then
        sed -i.bak "s|^JWT_SECRET=.*|JWT_SECRET=${JWT_SECRET}|" .env && rm -f .env.bak
    else
        echo "JWT_SECRET=${JWT_SECRET}" >> .env
    fi
    
    echo -e "${GREEN}✓ JWT_SECRET generated and saved to .env${NC}"
else
    echo -e "${GREEN}✓ JWT_SECRET is already configured${NC}"
fi

# Check Docker installation
if ! command -v docker &> /dev/null; then
    echo -e "${RED}✗ Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Docker is installed${NC}"

# Check Docker Compose installation
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${RED}✗ Docker Compose is not installed. Please install Docker Compose first.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Docker Compose is available${NC}"
echo ""

# Ask user if they want to start the application
echo -e "${YELLOW}Do you want to start the application now? (y/n)${NC}"
read -r response

if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    echo ""
    echo -e "${YELLOW}Building and starting containers...${NC}"
    
    # Use docker compose (newer) or docker-compose (older)
    if docker compose version &> /dev/null; then
        docker compose up -d --build
    else
        docker-compose up -d --build
    fi
    
    echo ""
    echo -e "${GREEN}==========================================${NC}"
    echo -e "${GREEN}  Application is starting!${NC}"
    echo -e "${GREEN}==========================================${NC}"
    echo ""
    echo "Services:"
    echo "  - Frontend: http://localhost"
    echo "  - Backend API: http://localhost:8080"
    echo "  - PostgreSQL: localhost:5432"
    echo ""
    echo "Useful commands:"
    echo "  docker compose logs -f          # View logs"
    echo "  docker compose down             # Stop all services"
    echo "  docker compose ps               # Check status"
    echo ""
else
    echo ""
    echo -e "${YELLOW}To start the application later, run:${NC}"
    echo "  docker compose up -d --build"
    echo ""
fi

echo -e "${GREEN}Setup complete!${NC}"
