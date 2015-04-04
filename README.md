```sql
sqlite3 tracks.db <<EOF
CREATE TABLE tracks (
    songName text,
    artistName text,
    spotifyStatus text
);
EOF
```