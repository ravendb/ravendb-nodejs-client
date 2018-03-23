//TODO
public class ExceptionDispatcher {

    public static RavenException get(ExceptionSchema schema, int code) {
        return get(schema.getMessage(), schema.getError(), schema.getType(), code);
    }

    public static RavenException get(String message, String error, String typeAsString, int code) {
        if (code == HttpStatus.SC_CONFLICT) {
            if (typeAsString.contains("DocumentConflictException")) {
                return DocumentConflictException.fromMessage(message);
            }
            return new ConcurrencyException(message);
        }

        Class<?> type = getType(typeAsString);
        if (type == null) {
            return new RavenException(error);
        }

        RavenException exception;
        try {
            exception = (RavenException) type.getConstructor(String.class).newInstance(error);
        } catch (Exception e) {
            return new RavenException(error);
        }

        if (!RavenException.class.isAssignableFrom(type)) {
            return new RavenException(error, exception);
        }

        return exception;
    }

    public static void throwException(CloseableHttpResponse response) {
        if (response == null) {
            throw new IllegalArgumentException("Response cannot be null");
        }

        try {
            InputStream stream = RequestExecutor.readAsStream(response);
            String json = IOUtils.toString(stream, "UTF-8");
            ExceptionSchema schema = JsonExtensions.getDefaultMapper().readValue(json, ExceptionSchema.class);

            if (response.getStatusLine().getStatusCode() == HttpStatus.SC_CONFLICT) {
                throwConflict(schema, json);
            }

            Class<?> type = getType(schema.getType());
            if (type == null) {
                throw RavenException.generic(schema.getError(), json);
            }

            RavenException exception;

            try {
                exception = (RavenException) type.getConstructor(String.class).newInstance(schema.getError());
            } catch (Exception e) {
                throw RavenException.generic(schema.getError(), json);
            }

            if (!RavenException.class.isAssignableFrom(type)) {
                throw new RavenException(schema.getError(), exception);
            }

            if (IndexCompilationException.class.equals(type)) {
                IndexCompilationException indexCompilationException = (IndexCompilationException) exception;
                JsonNode jsonNode = JsonExtensions.getDefaultMapper().readTree(json);
                JsonNode indexDefinitionProperty = jsonNode.get("TransformerDefinitionProperty");
                if (indexDefinitionProperty != null) {
                    indexCompilationException.setIndexDefinitionProperty(indexDefinitionProperty.asText());
                }

                JsonNode problematicText = jsonNode.get("ProblematicText");
                if (problematicText != null) {
                    indexCompilationException.setProblematicText(problematicText.asText());
                }

                throw indexCompilationException;
            }

            throw exception;

        } catch (IOException e) {
            throw new RavenException(e.getMessage(), e);
        } finally {
            IOUtils.closeQuietly(response);
        }
    }


    private static void throwConflict(ExceptionSchema schema, String json) {
        if (schema.getType().contains("DocumentConflictException")) {
            throw DocumentConflictException.fromJson(json);
        }
        throw new ConcurrencyException(schema.getMessage());
    }


    private static Class<?> getType(String typeAsString) {
        if ("System.TimeoutException".equals(typeAsString)) {
            return TimeoutException.class;
        }
        String prefix = "Raven.Client.Exceptions.";
        if (typeAsString.startsWith(prefix)) {
            String exceptionName = typeAsString.substring(prefix.length());
            if (exceptionName.contains(".")) {
                String[] tokens = exceptionName.split("\\.");
                for (int i = 0; i < tokens.length - 1; i++) {
                    tokens[i] = tokens[i].toLowerCase();
                }
                exceptionName = String.join(".", tokens);
            }

            try {
                return Class.forName(RavenException.class.getPackage().getName() + "." + exceptionName);
            } catch (Exception e) {
                return null;
            }
        } else {
            return null;
        }
    }