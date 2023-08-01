#!/usr/bin/env bash

MIN_MAJOR=18
MIN_MINOR=0
MIN_PATCH=0

VERSION=( $(node -e "console.log(/^v(\d+)\.(\d+)\.(\d+)$/.exec(process.version).slice(1, 4).join(' '))") )

MAJOR=${VERSION[0]}
MINOR=${VERSION[1]}
PATCH=${VERSION[2]}

if [ $MAJOR -lt $MIN_MAJOR ]; then
	printf "This script is requires node version v$MIN_MAJOR.$MIN_MINOR.$MIN_PATCH or above; found v$MAJOR.$MINOR.$PATCH."
	exit 1
fi

if [ $MINOR -lt $MIN_MINOR ]; then
	printf "This script is requires node version v$MIN_MAJOR.$MIN_MINOR.$MIN_PATCH or above; found v$MAJOR.$MINOR.$PATCH."
	exit 1
fi

if [ $PATCH -lt $MIN_PATCH ]; then
	printf "This script is requires node version v$MIN_MAJOR.$MIN_MINOR.$MIN_PATCH or above; found v$MAJOR.$MINOR.$PATCH."
	exit 1
fi

"$@"
