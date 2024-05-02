
#include <gnu/libc-version.h>
#include <stdio.h>
#include <unistd.h>

int main() {
    // method 1, use macro
    printf("%d.%d\n", __GLIBC__, __GLIBC_MINOR__);

    // method 2, use gnu_get_libc_version 
    puts(gnu_get_libc_version());

    // method 3, use confstr function
    char version[30] = {0};
    confstr(_CS_GNU_LIBC_VERSION, version, 30);
    puts(version);

    return 0;
}
