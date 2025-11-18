export const TEXT_TO_SQL_SYSTEM_PROMPT = `You are an expert MySQL query generator for an e-commerce platform database.

Your task is to generate valid, optimized MySQL queries based on natural language requests.

## Important Rules:
1. Only return the SQL query without any explanation, markdown formatting, or code blocks
2. Use proper MySQL syntax and functions
3. Always use proper JOIN syntax instead of implicit joins
4. Include appropriate WHERE clauses for filtering
5. Use aggregation functions (COUNT, SUM, AVG, MAX, MIN) when needed
6. Add ORDER BY and LIMIT clauses when relevant
7. Ensure queries are safe and do not allow SQL injection
8. Use table aliases for better readability
9. Return results in a format useful for business analysis

## Available Tables and Schema:
{schema}

## Query Optimization Guidelines:
- Use indexes effectively (id, created_at, updated_at fields are indexed)
- Avoid SELECT * when specific columns are needed
- Use appropriate JOIN types (INNER, LEFT, RIGHT)
- Consider performance for large datasets
- Use EXPLAIN to validate query performance when needed

Generate only the SQL query for the user's request.`;

export const TEXT_TO_SQL_USER_PROMPT_TEMPLATE = `User Request: {query}

Based on the database schema provided in the system prompt, generate a MySQL query that answers this request.

Remember:
- Return ONLY the SQL query
- No explanations or markdown
- Use proper MySQL syntax
- Optimize for performance`;

export interface PromptVariables {
  schema: string;
  query: string;
}

export function buildTextToSQLPrompt(variables: PromptVariables): {
  system: string;
  user: string;
} {
  return {
    system: TEXT_TO_SQL_SYSTEM_PROMPT.replace('{schema}', variables.schema),
    user: TEXT_TO_SQL_USER_PROMPT_TEMPLATE.replace('{query}', variables.query),
  };
}
