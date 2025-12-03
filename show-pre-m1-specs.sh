#!/bin/bash

# 📋 РАЗВЕРНУТЫЕ СПЕЦИФИКАЦИИ SEO МАШИНЫ 6.0 (ДО M1)
# Bash-скрипт для вывода всех спецификаций Pre-M1 версии

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Функция для вывода заголовка
print_header() {
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}${WHITE}$1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

# Функция для вывода подзаголовка
print_subheader() {
    echo ""
    echo -e "${YELLOW}▶ $1${NC}"
    echo ""
}

# Очистка экрана
clear

# Заголовок
print_header "📋 РАЗВЕРНУТЫЕ СПЕЦИФИКАЦИИ SEO МАШИНЫ 6.0 (ДО M1)"

# Файл со спецификациями
SPECS_FILE="SEO_MACHINE_SPECS_PRE_M1_DETAILED.md"

if [ ! -f "$SPECS_FILE" ]; then
    echo -e "${RED}Ошибка: Файл $SPECS_FILE не найден!${NC}"
    exit 1
fi

# Выводим содержимое файла с форматированием
in_code_block=false
in_list=false

while IFS= read -r line || [ -n "$line" ]; do
    # Обработка блоков кода
    if [[ $line =~ ^\`\`\` ]]; then
        if [ "$in_code_block" = false ]; then
            in_code_block=true
            echo -e "${MAGENTA}"
        else
            in_code_block=false
            echo -e "${NC}"
        fi
        continue
    fi
    
    if [ "$in_code_block" = true ]; then
        echo -e "${MAGENTA}$line${NC}"
        continue
    fi
    
    # Обработка заголовков
    if [[ $line =~ ^##\  ]]; then
        header_text=$(echo "$line" | sed 's/^## //')
        print_header "$header_text"
        continue
    fi
    
    if [[ $line =~ ^###\  ]]; then
        subheader_text=$(echo "$line" | sed 's/^### //')
        print_subheader "$subheader_text"
        continue
    fi
    
    if [[ $line =~ ^####\  ]]; then
        subsubheader_text=$(echo "$line" | sed 's/^#### //')
        echo -e "${BLUE}    → $subsubheader_text${NC}"
        continue
    fi
    
    # Обработка списков
    if [[ $line =~ ^-\  ]] || [[ $line =~ ^\*\  ]] || [[ $line =~ ^[0-9]+\.\  ]]; then
        section_text=$(echo "$line" | sed 's/^[-*] //' | sed 's/^[0-9]\+\. //')
        echo -e "${GREEN}  • $section_text${NC}"
        continue
    fi
    
    # Обработка разделителей
    if [[ $line =~ ^---$ ]]; then
        echo -e "${CYAN}────────────────────────────────────────────────────────────────────────────${NC}"
        continue
    fi
    
    # Обработка жирного текста
    if [[ $line =~ \*\*[^*]+\*\* ]]; then
        line=$(echo "$line" | sed 's/\*\*\([^*]*\)\*\*/'"${BOLD}"'\1'"${NC}"'/g')
    fi
    
    # Обработка inline кода
    if [[ $line =~ \`[^`]+\` ]]; then
        line=$(echo "$line" | sed 's/`\([^`]*\)`/'"${MAGENTA}"'\1'"${NC}"'/g')
    fi
    
    # Вывод обычной строки
    if [ -z "$line" ]; then
        echo ""
    else
        echo -e "$line"
    fi
done < "$SPECS_FILE"

# Финальный разделитель
echo ""
print_header "📄 КОНЕЦ СПЕЦИФИКАЦИЙ"
echo ""
echo -e "${GREEN}Для просмотра исходного файла:${NC} cat $SPECS_FILE"
echo -e "${GREEN}Для редактирования:${NC} nano $SPECS_FILE"
echo -e "${GREEN}Для просмотра в less:${NC} ./show-pre-m1-specs.sh | less -R"
echo ""
