# view-storage

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.0.26. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.

# view-storage

This package is responsible for storing views data using a ViewsDatabase. It uses the `drizzle-orm` and `@planetscale/database` packages for database operations.

## Installation

To install dependencies, run the following command:

```bash
bun install
```

## Usage

To use this package, you need to create a database using the `createDb` function exported from the `client.ts` file. This function requires a `CreateDbOptions` object with host, username, and password properties.

Here's an example:

```
import { createDb } from 'view-storage';

const db = createDb({
host: 'your_database_host',
username: 'your_username',
password: 'your_password',
});
```

You can then create a ViewsStorage instance by passing the database to its constructor:

```
import { ViewsStorage } from 'view-storage';

const viewsStorage = new ViewsStorage(db);
```

This project was created using [bun](https://bun.sh) init in bun v1.0.26. Bun is a fast all-in-one JavaScript runtime.

Please replace `'your_database_host'`, `'your_username'`, and `'your_password'` with your actual database host, username, and password respectively.
