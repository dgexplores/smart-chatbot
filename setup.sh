#!/bin/bash

# Smart Sales Consultancy Platform - Local Installation Bootstrapper
# Developed by: Deepak Gangwar
# Color formatting tags
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}===================================================${NC}"
echo -e "${BLUE}    Smart Sales Consultancy Platform Bootstrapper   ${NC}"
echo -e "${BLUE}    Developed by: Deepak Gangwar                     ${NC}"
echo -e "${BLUE}===================================================${NC}"

# 1. Prerequisite verification checks
echo -e "\n${YELLOW}[1/4] Checking System Prerequisites...${NC}"

if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed. Please install Node v18+ first.${NC}"
    exit 1
else
    echo -e "${GREEN}✔ Node.js installed: $(node --version)${NC}"
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm package manager is not installed.${NC}"
    exit 1
else
    echo -e "${GREEN}✔ npm installed: v$(npm --version)${NC}"
fi

# 2. Setup Environment Variables
echo -e "\n${YELLOW}[2/4] Initializing Config Files...${NC}"
if [ ! -f "server/.env" ]; then
    echo -e "${YELLOW}Copying template configuration to server/.env...${NC}"
    cp server/.env.example server/.env
    echo -e "${GREEN}✔ Created server/.env file. Remember to fill in your GEMINI_API_KEY and MONGO_URI!${NC}"
else
    echo -e "${GREEN}✔ Existing server/.env file detected.${NC}"
fi

# 3. Installing dependencies
echo -e "\n${YELLOW}[3/4] Installing Project Dependencies...${NC}"

echo -e "${BLUE}Installing backend dependencies...${NC}"
cd server
npm install
cd ..

echo -e "${BLUE}Installing frontend dependencies...${NC}"
cd client
npm install
cd ..

echo -e "${GREEN}✔ All node packages installed successfully.${NC}"

# 4. Building source directories
echo -e "\n${YELLOW}[4/4] Building Project Packages...${NC}"

echo -e "${BLUE}Compiling TypeScript backend server...${NC}"
cd server
npm run build
cd ..

echo -e "${BLUE}Compiling Vite client dashboard bundle...${NC}"
cd client
npm run build
cd ..

echo -e "${GREEN}✔ Both backend and frontend projects compiled with zero errors.${NC}"

echo -e "${BLUE}===================================================${NC}"
echo -e "${GREEN}   Setup Completed Successfully! [By Deepak Gangwar] ${NC}"
echo -e "${BLUE}===================================================${NC}"
echo -e "\nTo launch the services in development mode:"
echo -e "1. Open a terminal and run: ${YELLOW}cd server && npm run start${NC}"
echo -e "2. Open a second terminal and run: ${YELLOW}cd client && npm run dev${NC}"
echo -e "3. Access the browser client at: ${GREEN}http://localhost:5173${NC}"
echo -e "${BLUE}===================================================${NC}"
