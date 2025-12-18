# Use a lightweight Node.js image
FROM node:20-alpine

# Set the working directory
WORKDIR /app

# Copy package.json to install dependencies first (caching layer)
COPY package.json ./

# Install dependencies (if any)
# Since the project currently has no dependencies in package.json, this is mostly a placeholder for future-proofing
# or if there were devDependencies we wanted to prune with --production
RUN npm install --production

# Copy the rest of the application code
COPY apps ./apps

# Create the output directory to ensure permissions (though app does this too)
RUN mkdir -p notebooklm_output && chown node:node notebooklm_output

# Expose the port the app runs on
EXPOSE 8787

# Use a non-root user for security
USER node

# Start the application
CMD ["npm", "run", "dev"]
