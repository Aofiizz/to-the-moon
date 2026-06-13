#!/bin/bash

# ==============================================================================
# Setup Databases Script for macOS (Optimized for Apple Silicon M1/M2/M3)
# Author: Senior DevOps Engineer & Full-Stack Developer
# ==============================================================================

# Text formatting helper variables
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color
BOLD='\033[1m'
CYAN='\033[0;36m'
YELLOW='\033[0;33m'

# Logger functions
log_info() {
    echo -e "${CYAN}[INFO]${NC} $1"
}

log_success() {
    echo -e "✅ ${GREEN}${BOLD}Success:${NC} $1"
}

log_error() {
    echo -e "❌ ${RED}${BOLD}Error:${NC} $1"
}

log_warning() {
    echo -e "⚠️ ${YELLOW}${BOLD}Warning:${NC} $1"
}

# --- 1. SYSTEM CHECK (macOS Only) ---
if [[ "$OSTYPE" != "darwin"* ]]; then
    log_error "This script is designed to run on macOS only."
    exit 1
fi

# --- 2. HOMEBREW DETECTION & INSTALLATION ---
log_info "Checking Homebrew installation..."

BREW_M1_PATH="/opt/homebrew/bin/brew"
BREW_INTEL_PATH="/usr/local/bin/brew"

# Try to find brew
if [ -f "$BREW_M1_PATH" ]; then
    BREW_CMD="$BREW_M1_PATH"
    eval "$($BREW_CMD shellenv)"
elif [ -f "$BREW_INTEL_PATH" ]; then
    BREW_CMD="$BREW_INTEL_PATH"
    eval "$($BREW_CMD shellenv)"
elif command -v brew &> /dev/null; then
    BREW_CMD="brew"
else
    log_warning "Homebrew not found. Starting installation..."
    
    # Run official Homebrew installation script
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    
    # Double-check Apple Silicon path post-install
    if [ -f "$BREW_M1_PATH" ]; then
        BREW_CMD="$BREW_M1_PATH"
        # Configure shell environment for the current running script
        eval "$($BREW_CMD shellenv)"
        
        # Add to user's zprofile so it persists for M1 Mac
        if [ -f "$HOME/.zprofile" ]; then
            if ! grep -q "eval \"\$($BREW_M1_PATH shellenv)\"" "$HOME/.zprofile"; then
                echo "eval \"\$($BREW_M1_PATH shellenv)\"" >> "$HOME/.zprofile"
                log_info "Added Homebrew to $HOME/.zprofile"
            fi
        fi
    else
        log_error "Homebrew installation failed or path not recognized."
        exit 1
    fi
fi

# Verify Homebrew is functional
if $BREW_CMD --version &> /dev/null; then
    log_success "Homebrew is ready. Path: $($BREW_CMD --prefix)/bin/brew"
else
    log_error "Unable to execute brew commands."
    exit 1
fi

# --- DATABASE SETUP FUNCTIONS ---

install_postgres() {
    log_info "Starting PostgreSQL 16 installation..."
    if $BREW_CMD list postgresql@16 &>/dev/null; then
        log_warning "PostgreSQL 16 is already installed via Homebrew."
    else
        $BREW_CMD install postgresql@16
        if [ $? -eq 0 ]; then
            log_success "PostgreSQL 16 installed successfully."
        else
            log_error "Failed to install PostgreSQL 16."
            return 1
        fi
    fi

    log_info "Starting PostgreSQL background service..."
    $BREW_CMD services restart postgresql@16
    if [ $? -eq 0 ]; then
        log_success "PostgreSQL 16 service started successfully."
        # Create link to postgresql@16 binaries so 'psql' is globally accessible
        $BREW_CMD link postgresql@16 --force --overwrite
    else
        log_error "Failed to start PostgreSQL 16 service."
        return 1
    fi
}

install_mysql() {
    log_info "Starting MySQL (Latest Stable) installation..."
    if $BREW_CMD list mysql &>/dev/null; then
        log_warning "MySQL is already installed via Homebrew."
    else
        $BREW_CMD install mysql
        if [ $? -eq 0 ]; then
            log_success "MySQL installed successfully."
        else
            log_error "Failed to install MySQL."
            return 1
        fi
    fi

    log_info "Starting MySQL background service..."
    $BREW_CMD services restart mysql
    if [ $? -eq 0 ]; then
        log_success "MySQL service started successfully."
        echo -e "\n${YELLOW}${BOLD}====================================================================${NC}"
        echo -e "${YELLOW}${BOLD}IMPORTANT POST-INSTALLATION STEP FOR MYSQL:${NC}"
        echo -e "Please secure your database by running the command below in a new terminal:"
        echo -e "👉 ${BOLD}mysql_secure_installation${NC}"
        echo -e "${YELLOW}${BOLD}====================================================================${NC}\n"
    else
        log_error "Failed to start MySQL service."
        return 1
    fi
}

install_redis() {
    log_info "Starting Redis installation..."
    if $BREW_CMD list redis &>/dev/null; then
        log_warning "Redis is already installed via Homebrew."
    else
        $BREW_CMD install redis
        if [ $? -eq 0 ]; then
            log_success "Redis installed successfully."
        else
            log_error "Failed to install Redis."
            return 1
        fi
    fi

    log_info "Starting Redis background service..."
    $BREW_CMD services restart redis
    if [ $? -eq 0 ]; then
        log_success "Redis service started successfully."
    else
        log_error "Failed to start Redis service."
        return 1
    fi
}

# --- 3. INTERACTIVE MENU ---
show_menu() {
    echo -e "\n${BOLD}====================================================================${NC}"
    echo -e "👉 ${BOLD}macOS Database Auto-Installer Menu (Mac M1 Optimized)${NC}"
    echo -e "${BOLD}====================================================================${NC}"
    echo -e "1) Install PostgreSQL (v16)"
    echo -e "2) Install MySQL (Latest Stable)"
    echo -e "3) Install Redis"
    echo -e "4) Install ALL Databases (Postgres, MySQL, Redis)"
    echo -e "5) Exit"
    echo -e "===================================================================="
    read -p "Please choose an option [1-5]: " choice
    echo ""
}

while true; do
    show_menu
    case $choice in
        1)
            install_postgres
            ;;
        2)
            install_mysql
            ;;
        3)
            install_redis
            ;;
        4)
            log_info "Installing all databases sequentially..."
            install_postgres
            install_mysql
            install_redis
            log_success "All requested database services installed and running!"
            ;;
        5)
            log_info "Exiting setup script. Happy coding! 🚀"
            exit 0
            ;;
        *)
            log_error "Invalid option selected. Please select between 1 and 5."
            ;;
    esac
done
