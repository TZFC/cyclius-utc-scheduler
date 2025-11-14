# cyclius-utc-scheduler
A Cookie Clicker mod that automates swapping Cyclius between slots according to system UTC time

Provides two modes, toggle in Options menu:
```
        // [Avoid Diamond] (default):00:00-04:00 Ruby; -12:00 Jade; -18:00 Ruby; -24:00 unslot
        //   00:00–03:59 -> Ruby (1)
        //   04:00–11:59 -> Jade (2)
        //   12:00–17:59 -> Ruby (1)
        //   18:00–23:59 -> Unslot (null)
        //
        // [Use Diamond] (move_to_diamond):
        //   00:00–01:11 -> Diamond (0)
        //   01:12–03:59 -> Ruby (1)
        //   04:00–09:14 -> Jade (2)
        //   09:15–10:19 -> Diamond (0)
        //   10:20–11:59 -> Jade (2)
        //   12:00–13:11 -> Diamon (0)
        //   13:12–17:59 -> Ruby (1)
        //   18:00–19:29 -> Diamond (0)
        //   19:30–20:59 -> Unslot (null)
        //   21:00–22:29 -> Diamond (0)
        //   22:30–23:59 -> Unslot (null)
```
