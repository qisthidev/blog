---
description: Run daily pSEO automation script to generate a new batch of content
---

# Daily pSEO Generation

This workflow automates the daily generation of new pSEO entries by executing the `automate:pseo` script.

## Steps

1. **Gather Requirements:** Ask the user for the specific configuration for today's run.
    *   **model**: either `errors` or `performance`
    *   **hub**: the target hub slug
    *   **query** or **batch**: either a single specific topic query or a list of queries. If the user provides a list of queries, save them to a `daily-queries.txt` file in the project root first.

// turbo-all

2. **Run Automation Script:**
    Once you have the configuration, run the `automate:pseo` script. Use `npm run automate:pseo --` to pass the arguments.

    ```bash
    npm run automate:pseo -- --model <model> --hub <hub> --query "<query>"
    # OR if using a batch file
    npm run automate:pseo -- --model <model> --hub <hub> --batch daily-queries.txt
    ```

3. **Verify and Commit:**
    *   Verify the output logs to ensure `generate-pseo.ts` and `validate-pseo.ts` completed successfully without errors.
    *   Ask the user if they'd like to commit the resulting changes to the repository.
