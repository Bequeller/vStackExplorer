import type { Lesson, Source } from '../types';

// Every URL is pinned to the release tag, so line anchors stay valid (docs/decisions/0004).
const SF = 'https://github.com/spring-projects/spring-framework/blob/v7.0.10';
const SB = 'https://github.com/spring-projects/spring-boot/blob/v4.1.2';
const TC = 'https://github.com/apache/tomcat/blob/11.0.27';
const SF_V = 'Spring Framework 7.0.10';
const SB_V = 'Spring Boot 4.1.2';
const TC_V = 'Apache Tomcat 11.0.27';

const WEBMVC = `${SF}/spring-webmvc/src/main/java/org/springframework/web/servlet`;
const ANN = `${WEBMVC}/mvc/method/annotation`;
const WEB = `${SF}/spring-web/src/main/java/org/springframework`;
const SF_DOCS = `${SF}/framework-docs/modules/ROOT/pages/web/webmvc`;
const BOOT_TOMCAT = `${SB}/module/spring-boot-tomcat/src/main/java/org/springframework/boot/tomcat`;
const BOOT_SERVLET = `${SB}/module/spring-boot-servlet/src/main/java/org/springframework/boot/servlet`;
const TC_NET = `${TC}/java/org/apache/tomcat/util/net`;
const TC_HTTP = `${TC}/java/org/apache/coyote/http11`;

const s = {
  // Spring Framework reference documentation (source of docs.spring.io at this tag).
  dispatcherDocs: { label: 'Reference: DispatcherServlet Processing (sequence.adoc)', url: `${SF_DOCS}/mvc-servlet/sequence.adoc`, version: SF_V },
  specialBeans: { label: 'Reference: Special Bean Types (special-bean-types.adoc)', url: `${SF_DOCS}/mvc-servlet/special-bean-types.adoc`, version: SF_V },
  interceptorDocs: { label: 'Reference: Interception (handlermapping-interceptor.adoc)', url: `${SF_DOCS}/mvc-servlet/handlermapping-interceptor.adoc`, version: SF_V },
  requestBodyDocs: { label: 'Reference: @RequestBody (requestbody.adoc)', url: `${SF_DOCS}/mvc-controller/ann-methods/requestbody.adoc`, version: SF_V },
  responseBodyDocs: { label: 'Reference: @ResponseBody (responsebody.adoc)', url: `${SF_DOCS}/mvc-controller/ann-methods/responsebody.adoc`, version: SF_V },
  restControllerDocs: { label: 'Reference: Declaration (@RestController = @Controller + @ResponseBody)', url: `${SF_DOCS}/mvc-controller/ann.adoc`, version: SF_V },
  // Spring Boot.
  bootFilterDocs: {
    label: 'Boot reference: Registering Servlets, Filters, and Listeners as Spring Beans (servlet.adoc)',
    url: `${SB}/documentation/spring-boot-docs/src/docs/antora/modules/reference/pages/web/servlet.adoc#L556-L578`,
    version: SB_V,
  },
  starterWebmvc: { label: 'spring-boot-starter-webmvc dependencies (starter-tomcat 포함)', url: `${SB}/starter/spring-boot-starter-webmvc/build.gradle#L12-L17`, version: SB_V },
  defaultProtocol: { label: 'TomcatWebServerFactory.DEFAULT_PROTOCOL', url: `${BOOT_TOMCAT}/TomcatWebServerFactory.java#L57`, version: SB_V },
  defaultPort: { label: 'AbstractConfigurableWebServerFactory port = 8080', url: `${SB}/module/spring-boot-web-server/src/main/java/org/springframework/boot/web/server/AbstractConfigurableWebServerFactory.java#L43`, version: SB_V },
  tomcatConnections: { label: 'TomcatServerProperties (max-connections, accept-count)', url: `${BOOT_TOMCAT}/autoconfigure/TomcatServerProperties.java#L108-L114`, version: SB_V },
  tomcatThreads: { label: 'TomcatServerProperties.Threads (max, min-spare, max-queue-capacity)', url: `${BOOT_TOMCAT}/autoconfigure/TomcatServerProperties.java#L629-L647`, version: SB_V },
  encodingFilterOrder: { label: 'OrderedCharacterEncodingFilter order', url: `${BOOT_SERVLET}/filter/OrderedCharacterEncodingFilter.java#L18`, version: SB_V },
  formFilterOrder: { label: 'OrderedFormContentFilter.DEFAULT_ORDER', url: `${BOOT_SERVLET}/filter/OrderedFormContentFilter.java#L22`, version: SB_V },
  contextFilterOrder: { label: 'OrderedRequestContextFilter order', url: `${BOOT_SERVLET}/filter/OrderedRequestContextFilter.java#L19`, version: SB_V },
  wrapperMaxOrder: { label: 'OrderedFilter.REQUEST_WRAPPER_FILTER_MAX_ORDER', url: `${BOOT_SERVLET}/filter/OrderedFilter.java#L22`, version: SB_V },
  encodingProps: { label: 'ServletEncodingProperties (charset, shouldForce)', url: `${BOOT_SERVLET}/autoconfigure/ServletEncodingProperties.java#L26-L94`, version: SB_V },
  mvcFilters: { label: 'WebMvcAutoConfiguration: formContentFilter, requestContextFilter', url: `${SB}/module/spring-boot-webmvc/src/main/java/org/springframework/boot/webmvc/autoconfigure/WebMvcAutoConfiguration.java#L174-L177`, version: SB_V },
  bootJackson: { label: 'Boot JacksonHttpMessageConvertersConfiguration', url: `${SB}/module/spring-boot-http-converter/src/main/java/org/springframework/boot/http/converter/autoconfigure/JacksonHttpMessageConvertersConfiguration.java#L63-L79`, version: SB_V },
  // Tomcat.
  namePrefix: { label: 'Http11NioProtocol.getNamePrefix()', url: `${TC_HTTP}/Http11NioProtocol.java#L97-L103`, version: TC_V },
  nameInternal: { label: 'AbstractProtocol.getNameInternal()', url: `${TC}/java/org/apache/coyote/AbstractProtocol.java#L657-L680`, version: TC_V },
  endpointName: { label: 'AbstractProtocol: endpoint.setName() (따옴표 제거)', url: `${TC}/java/org/apache/coyote/AbstractProtocol.java#L956`, version: TC_V },
  acceptor: { label: 'AbstractEndpoint: "-Acceptor" thread', url: `${TC_NET}/AbstractEndpoint.java#L2310`, version: TC_V },
  poller: { label: 'NioEndpoint: "-Poller" thread', url: `${TC_NET}/NioEndpoint.java#L542`, version: TC_V },
  execName: { label: 'AbstractEndpoint.createExecutor(): getName() + "-exec-"', url: `${TC_NET}/AbstractEndpoint.java#L1952`, version: TC_V },
  execSubmit: { label: 'AbstractEndpoint.processSocket(): executor.execute(sc)', url: `${TC_NET}/AbstractEndpoint.java#L2126`, version: TC_V },
  adapterService: { label: 'Http11Processor: getAdapter().service()', url: `${TC_HTTP}/Http11Processor.java#L411`, version: TC_V },
  pipeline: { label: 'CoyoteAdapter.service(): pipeline invoke', url: `${TC}/java/org/apache/catalina/connector/CoyoteAdapter.java#L347`, version: TC_V },
  wrapperValve: { label: 'StandardWrapperValve: createFilterChain / doFilter', url: `${TC}/java/org/apache/catalina/core/StandardWrapperValve.java#L138-L164`, version: TC_V },
  filterChain: { label: 'ApplicationFilterChain.internalDoFilter()', url: `${TC}/java/org/apache/catalina/core/ApplicationFilterChain.java#L111-L132`, version: TC_V },
  prepareResponse: { label: 'Http11Processor.prepareResponse(): chunked / Content-Length', url: `${TC_HTTP}/Http11Processor.java#L951-L978`, version: TC_V },
  dateHeader: { label: 'Http11Processor.prepareResponse(): Date header', url: `${TC_HTTP}/Http11Processor.java#L985-L989`, version: TC_V },
  sendStatus: { label: 'Http11OutputBuffer.sendStatus(): reason phrase 생략', url: `${TC_HTTP}/Http11OutputBuffer.java#L345-L378`, version: TC_V },
  chunkedFilter: { label: 'ChunkedOutputFilter: chunk header, CRLF, end chunk', url: `${TC_HTTP}/filters/ChunkedOutputFilter.java#L38-L115`, version: TC_V },
  keepAlive: { label: 'AbstractProtocol.ConnectionHandler: keep-alive면 registerReadInterest()', url: `${TC}/java/org/apache/coyote/AbstractProtocol.java#L1377-L1382`, version: TC_V },
  // Spring Framework source.
  encodingFilter: { label: 'CharacterEncodingFilter.doFilterInternal()', url: `${WEB}/web/filter/CharacterEncodingFilter.java#L186-L200`, version: SF_V },
  formFilterMethods: { label: 'FormContentFilter HTTP_METHODS', url: `${WEB}/web/filter/FormContentFilter.java#L59`, version: SF_V },
  contextFilter: { label: 'RequestContextFilter: init / reset context holders', url: `${WEB}/web/filter/RequestContextFilter.java#L97-L103`, version: SF_V },
  frameworkServlet: { label: 'FrameworkServlet.service() / doPost() / processRequest()', url: `${WEBMVC}/FrameworkServlet.java#L870-L1000`, version: SF_V },
  doService: { label: 'DispatcherServlet.doService()', url: `${WEBMVC}/DispatcherServlet.java#L829`, version: SF_V },
  doDispatch: { label: 'DispatcherServlet.doDispatch()', url: `${WEBMVC}/DispatcherServlet.java#L935-L990`, version: SF_V },
  getHandler: { label: 'DispatcherServlet.getHandler()', url: `${WEBMVC}/DispatcherServlet.java#L1154-L1165`, version: SF_V },
  sortMappings: { label: 'DispatcherServlet.initHandlerMappings(): sort', url: `${WEBMVC}/DispatcherServlet.java#L516`, version: SF_V },
  mappingOrders: { label: 'WebMvcConfigurationSupport: HandlerMapping orders', url: `${WEBMVC}/config/annotation/WebMvcConfigurationSupport.java#L268-L556`, version: SF_V },
  interceptors: { label: 'WebMvcConfigurationSupport.getInterceptors(): addInterceptors() 먼저', url: `${WEBMVC}/config/annotation/WebMvcConfigurationSupport.java#L303-L311`, version: SF_V },
  lookup: { label: 'AbstractHandlerMethodMapping.lookupHandlerMethod()', url: `${WEBMVC}/handler/AbstractHandlerMethodMapping.java#L393`, version: SF_V },
  pathParser: { label: 'AbstractHandlerMapping: PathPatternParser default', url: `${WEBMVC}/handler/AbstractHandlerMapping.java#L95`, version: SF_V },
  preHandle: { label: 'HandlerExecutionChain.applyPreHandle()', url: `${WEBMVC}/HandlerExecutionChain.java#L142`, version: SF_V },
  getAdapter: { label: 'DispatcherServlet.getHandlerAdapter()', url: `${WEBMVC}/DispatcherServlet.java#L1185-L1196`, version: SF_V },
  supports: { label: 'AbstractHandlerMethodAdapter.supports()', url: `${WEBMVC}/mvc/method/AbstractHandlerMethodAdapter.java#L68-L69`, version: SF_V },
  argResolvers: { label: 'RequestMappingHandlerAdapter.getDefaultArgumentResolvers()', url: `${ANN}/RequestMappingHandlerAdapter.java#L644-L690`, version: SF_V },
  invokeHandler: { label: 'RequestMappingHandlerAdapter.invokeHandlerMethod()', url: `${ANN}/RequestMappingHandlerAdapter.java#L885-L940`, version: SF_V },
  argValues: { label: 'InvocableHandlerMethod.invokeForRequest() / getMethodArgumentValues()', url: `${WEB}/web/method/support/InvocableHandlerMethod.java#L171-L230`, version: SF_V },
  doInvoke: { label: 'InvocableHandlerMethod.doInvoke()', url: `${WEB}/web/method/support/InvocableHandlerMethod.java#L243`, version: SF_V },
  supportsParameter: { label: 'RequestResponseBodyMethodProcessor.supportsParameter()', url: `${ANN}/RequestResponseBodyMethodProcessor.java#L134-L136`, version: SF_V },
  readConverters: { label: 'AbstractMessageConverterMethodArgumentResolver.readWithMessageConverters()', url: `${ANN}/AbstractMessageConverterMethodArgumentResolver.java#L147-L200`, version: SF_V },
  resolveArgument: { label: 'RequestResponseBodyMethodProcessor.resolveArgument()', url: `${ANN}/RequestResponseBodyMethodProcessor.java#L152-L186`, version: SF_V },
  jacksonTypes: { label: 'JacksonJsonHttpMessageConverter media types', url: `${WEB}/http/converter/json/JacksonJsonHttpMessageConverter.java#L55-L61`, version: SF_V },
  invokeAndHandle: { label: 'ServletInvocableHandlerMethod.invokeAndHandle()', url: `${ANN}/ServletInvocableHandlerMethod.java#L114-L144`, version: SF_V },
  setStatus: { label: 'ServletInvocableHandlerMethod.setResponseStatus()', url: `${ANN}/ServletInvocableHandlerMethod.java#L149-L168`, version: SF_V },
  returnHandlers: { label: 'RequestMappingHandlerAdapter.getDefaultReturnValueHandlers()', url: `${ANN}/RequestMappingHandlerAdapter.java#L730-L775`, version: SF_V },
  selectHandler: { label: 'HandlerMethodReturnValueHandlerComposite.selectHandler()', url: `${WEB}/web/method/support/HandlerMethodReturnValueHandlerComposite.java#L70-L90`, version: SF_V },
  supportsReturn: { label: 'RequestResponseBodyMethodProcessor.supportsReturnType()', url: `${ANN}/RequestResponseBodyMethodProcessor.java#L139-L143`, version: SF_V },
  handleReturn: { label: 'RequestResponseBodyMethodProcessor.handleReturnValue()', url: `${ANN}/RequestResponseBodyMethodProcessor.java#L195-L214`, version: SF_V },
  writeConverters: { label: 'AbstractMessageConverterMethodProcessor.writeWithMessageConverters()', url: `${ANN}/AbstractMessageConverterMethodProcessor.java#L205-L330`, version: SF_V },
  defaultHeaders: { label: 'AbstractHttpMessageConverter.addDefaultHeaders() / getContentLength()', url: `${WEB}/http/converter/AbstractHttpMessageConverter.java#L244-L296`, version: SF_V },
  jacksonWrite: { label: 'AbstractJacksonHttpMessageConverter.writeInternal(): flush()', url: `${WEB}/http/converter/AbstractJacksonHttpMessageConverter.java#L395-L440`, version: SF_V },
  getModelAndView: { label: 'RequestMappingHandlerAdapter.getModelAndView()', url: `${ANN}/RequestMappingHandlerAdapter.java#L1037-L1042`, version: SF_V },
  dispatchResult: { label: 'DispatcherServlet.processDispatchResult()', url: `${WEBMVC}/DispatcherServlet.java#L1022-L1060`, version: SF_V },
  // HTTP specification.
  rfcChunked: { label: 'RFC 9112 §7.1 Chunked Transfer Coding', url: 'https://www.rfc-editor.org/rfc/rfc9112#section-7.1', version: 'RFC 9112 (2022)' },
  rfcRequestLine: { label: 'RFC 9112 §3 Request Line', url: 'https://www.rfc-editor.org/rfc/rfc9112#section-3', version: 'RFC 9112 (2022)' },
  rfcStatusLine: { label: 'RFC 9112 §4 Status Line', url: 'https://www.rfc-editor.org/rfc/rfc9112#section-4', version: 'RFC 9112 (2022)' },
} satisfies Record<string, Source>;

const REQUEST_RAW =
  'POST /api/orders HTTP/1.1\r\nHost: localhost:8080\r\nContent-Type: application/json\r\nAccept: application/json\r\nContent-Length: 29\r\n\r\n{"productId":42,"quantity":2}';
const RESPONSE_BODY = '{"orderId":1001,"status":"CREATED"}';
const RESPONSE_RAW =
  `HTTP/1.1 201 \r\nContent-Type: application/json\r\nTransfer-Encoding: chunked\r\nDate: Tue, 03 Nov 2026 05:12:09 GMT\r\n\r\n23\r\n${RESPONSE_BODY}\r\n0\r\n\r\n`;

const THREADS: { type: 'table'; columns: string[] } = { type: 'table', columns: ['thread', '상태'] };

export const lesson: Lesson = {
  id: 'request-flow',
  topic: 'spring-boot',
  title: 'HTTP 요청 한 건이 Spring MVC를 지나가는 길',
  subtitle: 'HTTP 요청 흐름',
  summary:
    '`POST /api/orders` 하나가 Tomcat worker thread → Filter chain → `DispatcherServlet` → `HandlerMapping` → `HandlerAdapter` → `@RequestBody` 변환 → controller → `@ResponseBody` 변환 → 응답으로 가는 핵심 경로입니다.',
  versions: {
    'Spring Boot': '4.1.2',
    'Spring Framework': '7.0.10',
    'Apache Tomcat': '11.0.27',
  },
  layers: [
    { id: 'servlet', label: 'Servlet' },
    { id: 'mvc', label: 'Spring MVC' },
    { id: 'app', label: 'Application' },
  ],
  nodes: ['client', 'tomcat', 'filters', 'dispatcher', 'mapping', 'adapter', 'resolver', 'controller', 'returns'],
  states: [
    {
      node: 'tomcat',
      title: 'worker thread pool (예시 3개)',
      view: { ...THREADS, rows: [['exec-1', '대기'], ['exec-2', '대기'], ['exec-3', '대기']] },
    },
    {
      node: 'mapping',
      title: 'HandlerMapping (order 순)',
      view: {
        type: 'table',
        columns: ['HandlerMapping', '반환'],
        rows: [
          ['RouterFunctionMapping', '—'],
          ['RequestMappingHandlerMapping', '—'],
        ],
      },
    },
    {
      node: 'adapter',
      title: 'mavContainer · response',
      view: {
        type: 'table',
        columns: ['항목', '값'],
        rows: [
          ['requestHandled', 'false'],
          ['status', '200'],
          ['committed', 'false'],
        ],
      },
    },
  ],
  steps: [
    {
      id: 'arrive',
      layer: 'servlet',
      path: 'critical',
      kind: 'move',
      from: 'client',
      to: 'tomcat',
      token: { kind: 'request', label: 'POST /api/orders' },
      title: '요청이 Tomcat에 도착',
      summary: 'embedded Tomcat이 port 8080에서 HTTP 요청을 받습니다.',
      detail:
        'Spring Boot의 `spring-boot-starter-webmvc`는 embedded Tomcat을 띄우고, Tomcat은 기본 port 8080에서 `Http11NioProtocol`로 연결을 받습니다. 연결을 받는 thread와 요청을 처리하는 thread는 다릅니다. 처리는 다음 단계의 worker thread가 맡습니다.',
      facts: [
        { key: 'server.port 기본값', value: '8080' },
        { key: 'protocol', value: '`Http11NioProtocol` (NIO)' },
      ],
      lines: ['POST /api/orders HTTP/1.1', 'Content-Type: application/json', 'Content-Length: 29'],
      record: {
        title: 'HTTP request',
        protocol: 'HTTP/1.1',
        wire: true,
        format: 'text',
        raw: REQUEST_RAW,
        segments: [
          { id: 'request-line', label: 'request line' },
          { id: 'headers', label: 'headers' },
          { id: 'body', label: 'body' },
        ],
        fields: [
          { name: 'method', value: 'POST', note: '`@PostMapping`과 매칭될 method', segment: 'request-line', span: 'POST' },
          { name: 'request-target', value: '/api/orders', note: '`HandlerMapping`이 찾는 path', segment: 'request-line', span: '/api/orders' },
          { name: 'Content-Type', value: 'application/json', note: 'body를 읽을 converter를 고르는 기준', segment: 'headers', span: 'Content-Type: application/json' },
          { name: 'Accept', value: 'application/json', note: '응답 converter를 고르는 기준', segment: 'headers', span: 'Accept: application/json' },
          { name: 'message-body', value: '{"productId":42,"quantity":2}', note: '`@RequestBody`가 읽을 JSON', segment: 'body', span: '{"productId":42,"quantity":2}', example: true },
        ],
      },
      sources: [s.starterWebmvc, s.defaultProtocol, s.defaultPort, s.acceptor, s.poller, s.rfcRequestLine],
    },
    {
      id: 'worker',
      layer: 'servlet',
      path: 'critical',
      kind: 'mutate',
      node: 'tomcat',
      after: { ...THREADS, rows: [['exec-1', 'POST /api/orders'], ['exec-2', '대기'], ['exec-3', '대기']] },
      title: 'worker thread 하나가 요청을 끝까지 맡음',
      summary: '`http-nio-8080-exec-N` 하나가 응답을 다 쓸 때까지 이 요청만 처리합니다.',
      detail:
        'Filter, `DispatcherServlet`, controller, 응답 쓰기까지 모두 이 한 thread에서 동기적으로 실행됩니다. 그래서 `ThreadLocal`에 둔 요청 정보(`RequestContextHolder`)가 요청 단위로 동작하고, controller가 오래 기다리면 그동안 thread 하나가 묶입니다.',
      facts: [
        { key: 'thread 이름', value: '`http-nio-8080-exec-N`' },
        { key: 'server.tomcat.threads.max', value: '200' },
      ],
      lines: ['executor.execute(socketProcessor)', '→ http-nio-8080-exec-1'],
      sources: [s.execName, s.execSubmit, s.tomcatThreads],
    },
    {
      id: 'filters',
      layer: 'servlet',
      path: 'critical',
      kind: 'move',
      from: 'tomcat',
      to: 'filters',
      token: { kind: 'call', label: 'filterChain.doFilter()' },
      title: 'Filter chain을 order 순서로 통과',
      summary: 'Servlet `Filter`들이 `DispatcherServlet`보다 먼저, 낮은 order부터 실행됩니다.',
      detail:
        'Boot는 `Filter` bean을 container에 등록하고 `/*`에 매핑합니다. 순서는 `@Order`나 `Ordered`로 정하고, 작을수록 먼저입니다. 각 Filter는 `chain.doFilter()`로 다음을 부르고, 돌아온 뒤의 코드는 응답 때 역순으로 실행됩니다. 기본 등록 예: `characterEncodingFilter`가 요청 encoding을 UTF-8로 맞춥니다.',
      facts: [
        { key: '위치', value: 'Servlet container, `DispatcherServlet` 앞' },
        { key: '순서', value: '`@Order` / `Ordered`, 작을수록 먼저' },
        { key: '응답 때', value: '`chain.doFilter()` 뒤 코드가 역순 실행' },
      ],
      sources: [s.bootFilterDocs, s.wrapperValve, s.filterChain, s.encodingFilterOrder, s.encodingFilter],
    },
    {
      id: 'dispatch',
      layer: 'servlet',
      path: 'critical',
      kind: 'move',
      from: 'filters',
      to: 'dispatcher',
      token: { kind: 'call', label: 'servlet.service()' },
      title: '마지막 Filter 다음은 DispatcherServlet',
      summary: 'Boot에서 `/`에 매핑된 Servlet은 `DispatcherServlet` 하나이고, `doDispatch()`가 분배합니다.',
      detail:
        'Filter를 다 돌면 `ApplicationFilterChain`이 Servlet의 `service()`를 부릅니다. `FrameworkServlet`이 `doPost()` → `processRequest()`로 받아 `DispatcherServlet.doDispatch()`로 넘깁니다. 이후 handler 찾기, 실행, 응답 처리가 모두 `doDispatch()` 안에서 일어납니다.',
      facts: [
        { key: 'Servlet 매핑', value: '`/` (Servlet이 하나일 때)' },
        { key: '분배 메서드', value: '`DispatcherServlet.doDispatch()`' },
      ],
      sources: [s.filterChain, s.frameworkServlet, s.doService, s.doDispatch, s.dispatcherDocs, s.bootFilterDocs],
    },
    {
      id: 'find-handler',
      layer: 'mvc',
      path: 'critical',
      kind: 'move',
      from: 'dispatcher',
      to: 'mapping',
      token: { kind: 'call', label: 'getHandler(request)' },
      title: 'HandlerMapping에게 handler를 묻기',
      summary: '`HandlerMapping`을 order 순서로 묻고, null이 아닌 첫 결과를 씁니다.',
      detail:
        '`getHandler()`는 등록된 `HandlerMapping`을 정렬된 순서로 돌며 `getHandler(request)`를 부릅니다. 첫 non-null 결과에서 멈춥니다. 아무도 찾지 못하면 `NoHandlerFoundException`이 나고, 기본 오류 처리로 404 응답이 됩니다.',
      facts: [
        { key: '규칙', value: 'order 순, 첫 non-null 결과' },
        { key: 'handler가 없으면', value: '`NoHandlerFoundException` (404)' },
      ],
      sources: [s.doDispatch, s.getHandler, s.sortMappings, s.mappingOrders, s.specialBeans],
    },
    {
      id: 'handler-found',
      layer: 'mvc',
      path: 'critical',
      kind: 'mutate',
      node: 'mapping',
      after: {
        type: 'table',
        columns: ['HandlerMapping', '반환'],
        rows: [
          ['RouterFunctionMapping', 'null'],
          ['RequestMappingHandlerMapping', 'HandlerMethod'],
        ],
      },
      title: '@PostMapping 메서드를 찾음',
      summary: '`RequestMappingHandlerMapping`이 path와 method로 `OrderController#create`를 고릅니다.',
      detail:
        '`@RequestMapping` 조건(path `/api/orders`, method `POST` 등)으로 메서드를 고르고, 그 메서드(`HandlerMethod`)와 interceptor 목록을 `HandlerExecutionChain`으로 묶어 돌려줍니다. `WebMvcConfigurer.addInterceptors()`로 등록한 interceptor가 이 목록에 들어갑니다.',
      facts: [
        { key: '매칭 기준', value: '`@RequestMapping`의 path, method 등' },
        { key: '반환', value: '`HandlerExecutionChain` = handler + interceptors' },
      ],
      record: {
        title: 'HandlerExecutionChain',
        protocol: 'Java object',
        wire: false,
        format: 'fields',
        segments: [
          { id: 'handler', label: 'handler' },
          { id: 'interceptors', label: 'interceptors' },
        ],
        fields: [
          { name: 'handler', value: 'OrderController#create(OrderRequest)', note: '`@PostMapping`이 붙은 controller 메서드(`HandlerMethod`)', segment: 'handler' },
          { name: 'interceptorList', value: '[앱 interceptor…, MVC 기본 2개]', note: '`addInterceptors()`로 등록한 것이 먼저, MVC가 넣는 2개가 뒤', segment: 'interceptors' },
        ],
      },
      sources: [s.lookup, s.interceptors, s.interceptorDocs],
    },
    {
      id: 'call-adapter',
      layer: 'mvc',
      path: 'critical',
      kind: 'move',
      from: 'dispatcher',
      to: 'adapter',
      token: { kind: 'call', label: 'ha.handle(req, res, handler)' },
      title: 'preHandle 다음 HandlerAdapter 호출',
      summary: 'interceptor의 `preHandle()`이 모두 true면 `HandlerAdapter.handle()`을 부릅니다.',
      detail:
        '`preHandle()`이 하나라도 false면 handler는 실행되지 않습니다(인증 체크 등에 쓰는 지점). `DispatcherServlet`은 handler 타입을 직접 모르므로 `supports(handler)`가 true인 `HandlerAdapter`에 실행을 맡기고, `@RequestMapping` 메서드는 `RequestMappingHandlerAdapter`가 맡습니다.',
      facts: [
        { key: 'preHandle이 false면', value: 'handler 실행 없이 종료' },
        { key: '@RequestMapping 메서드', value: '`RequestMappingHandlerAdapter`' },
      ],
      sources: [s.doDispatch, s.preHandle, s.getAdapter, s.supports, s.interceptorDocs],
    },
    {
      id: 'read-body',
      layer: 'mvc',
      path: 'critical',
      kind: 'move',
      from: 'adapter',
      to: 'resolver',
      token: { kind: 'data', label: 'JSON → OrderRequest' },
      title: '@RequestBody를 HttpMessageConverter가 읽음',
      summary: '`Content-Type`을 읽을 수 있는 converter가 JSON body를 `OrderRequest`로 바꿉니다.',
      detail:
        '파라미터마다 argument resolver를 고르고, `@RequestBody`는 `RequestResponseBodyMethodProcessor`가 맡습니다. 이 resolver가 `canRead(타입, Content-Type)`가 true인 첫 `HttpMessageConverter`(JSON이면 Jackson)로 body를 읽습니다. `@Valid`가 있으면 이어서 검증하고, 실패하면 400입니다.',
      facts: [
        { key: '@RequestBody resolver', value: '`RequestResponseBodyMethodProcessor`' },
        { key: 'JSON converter', value: '`JacksonJsonHttpMessageConverter`' },
        { key: '@Valid 실패', value: '`MethodArgumentNotValidException`' },
      ],
      record: {
        title: 'JSON body → OrderRequest',
        protocol: 'JSON',
        wire: true,
        format: 'text',
        raw: '{"productId":42,"quantity":2}',
        segments: [{ id: 'json', label: 'JSON object' }],
        fields: [
          { name: 'productId', value: '42', note: '`OrderRequest.productId`로', segment: 'json', span: '"productId":42', example: true },
          { name: 'quantity', value: '2', note: '`OrderRequest.quantity`로', segment: 'json', span: '"quantity":2', example: true },
        ],
      },
      sources: [s.argResolvers, s.supportsParameter, s.readConverters, s.resolveArgument, s.jacksonTypes, s.requestBodyDocs],
    },
    {
      id: 'invoke',
      layer: 'app',
      path: 'critical',
      kind: 'move',
      from: 'adapter',
      to: 'controller',
      token: { kind: 'call', label: 'create(request)' },
      title: 'controller 메서드 실행',
      summary: '준비된 인자로 reflection을 통해 `OrderController.create()`를 부릅니다.',
      detail:
        '여기서부터 애플리케이션 코드입니다. 예시는 `@RestController` 클래스의 `@PostMapping` `@ResponseStatus(HttpStatus.CREATED)` 메서드 `OrderResponse create(@RequestBody OrderRequest request)`입니다. service와 DB를 다녀오는 동안에도 같은 worker thread가 기다립니다.',
      facts: [
        { key: '호출', value: '`InvocableHandlerMethod.doInvoke(args)`' },
        { key: '실행 thread', value: '같은 `http-nio-8080-exec-N`' },
      ],
      lines: ['@PostMapping @ResponseStatus(CREATED)', 'OrderResponse create(@RequestBody OrderRequest request)'],
      sources: [s.doInvoke, s.invokeAndHandle],
    },
    {
      id: 'return-value',
      layer: 'mvc',
      path: 'critical',
      kind: 'move',
      from: 'controller',
      to: 'returns',
      token: { kind: 'data', label: 'OrderResponse' },
      title: '반환 값은 @ResponseBody 처리기로',
      summary: '`@RestController`는 `@ResponseBody`를 포함하므로 반환 객체를 body로 씁니다.',
      detail:
        '반환 값 처리기 중 `supportsReturnType()`이 true인 첫 handler가 선택됩니다. `@RestController`는 `@Controller` + `@ResponseBody`이므로 `RequestResponseBodyMethodProcessor`가 맡습니다. view 이름이 아니라 객체 자체가 응답 body가 됩니다.',
      facts: [
        { key: '@RestController', value: '`@Controller` + `@ResponseBody`' },
        { key: '처리기', value: '`RequestResponseBodyMethodProcessor`' },
      ],
      lines: ['OrderResponse[orderId=1001, status=CREATED]', '→ RequestResponseBodyMethodProcessor'],
      sources: [s.returnHandlers, s.selectHandler, s.supportsReturn, s.responseBodyDocs, s.restControllerDocs],
    },
    {
      id: 'write-body',
      layer: 'mvc',
      path: 'critical',
      kind: 'mutate',
      node: 'adapter',
      after: {
        type: 'table',
        columns: ['항목', '값'],
        rows: [
          ['requestHandled', 'true'],
          ['status', '201'],
          ['committed', 'true'],
        ],
      },
      title: '응답 body를 쓰고 commit',
      summary: '상태 201을 정하고, `Accept`에 맞춰 JSON으로 쓴 뒤 응답이 commit됩니다.',
      detail:
        '`@ResponseStatus`가 상태를 201로 바꾸고, content negotiation으로 `application/json`을 골라 Jackson이 body를 씁니다. view rendering은 없습니다. 응답은 `HandlerAdapter` 안에서 이미 commit되므로, `postHandle()`에서 header를 더하면 반영되지 않습니다. 대신 `ResponseBodyAdvice`를 씁니다.',
      facts: [
        { key: 'view rendering', value: '없음 (`ModelAndView` = null)' },
        { key: 'header를 더하려면', value: '`ResponseBodyAdvice` (`postHandle()`은 늦음)' },
      ],
      record: {
        title: 'JSON 응답 body',
        protocol: 'JSON',
        wire: true,
        format: 'text',
        raw: RESPONSE_BODY,
        segments: [{ id: 'json', label: 'JSON object' }],
        fields: [
          { name: 'orderId', value: '1001', note: '`OrderResponse.orderId`', segment: 'json', span: '"orderId":1001', example: true },
          { name: 'status', value: '"CREATED"', note: '`OrderResponse.status`', segment: 'json', span: '"status":"CREATED"', example: true },
        ],
      },
      sources: [s.setStatus, s.handleReturn, s.writeConverters, s.getModelAndView, s.dispatchResult, s.interceptorDocs],
    },
    {
      id: 'respond',
      layer: 'servlet',
      path: 'critical',
      kind: 'move',
      from: 'tomcat',
      to: 'client',
      token: { kind: 'response', label: '201 Created' },
      title: 'Filter를 거꾸로 지나 Tomcat이 응답 전송',
      summary: 'Filter의 후처리가 역순으로 돌고, Tomcat이 응답을 보낸 뒤 thread가 pool로 돌아갑니다.',
      detail:
        '`doDispatch()`가 끝나면 Filter들이 역순으로 빠져나옵니다. Tomcat은 길이를 모르는 body를 `Transfer-Encoding: chunked`로 보냅니다. 그 뒤 worker thread는 pool로 돌아가고, keep-alive 연결이면 socket은 다음 요청을 기다립니다.',
      facts: [
        { key: 'Content-Length가 없으면', value: '`Transfer-Encoding: chunked` (HTTP/1.1)' },
        { key: '응답 후 thread', value: 'pool로 반환' },
      ],
      lines: ['HTTP/1.1 201', 'Content-Type: application/json', 'Transfer-Encoding: chunked'],
      record: {
        title: 'HTTP response',
        protocol: 'HTTP/1.1',
        wire: true,
        format: 'text',
        raw: RESPONSE_RAW,
        segments: [
          { id: 'status-line', label: 'status line' },
          { id: 'headers', label: 'headers' },
          { id: 'body', label: 'chunked body' },
        ],
        fields: [
          { name: 'status-code', value: '201', note: '`@ResponseStatus(CREATED)`에서', segment: 'status-line', span: '201' },
          { name: 'Content-Type', value: 'application/json', note: 'content negotiation 결과', segment: 'headers', span: 'Content-Type: application/json' },
          { name: 'Transfer-Encoding', value: 'chunked', note: '길이를 몰라 Tomcat이 붙임', segment: 'headers', span: 'Transfer-Encoding: chunked' },
          { name: 'body', value: RESPONSE_BODY, note: 'chunk 안의 JSON', segment: 'body', span: RESPONSE_BODY, example: true },
        ],
      },
      sources: [s.contextFilter, s.filterChain, s.prepareResponse, s.jacksonWrite, s.keepAlive, s.rfcChunked],
    },
    {
      id: 'pool-exhausted',
      layer: 'servlet',
      path: 'side',
      kind: 'mutate',
      node: 'tomcat',
      after: { ...THREADS, rows: [['exec-1', '외부 API 대기'], ['exec-2', '외부 API 대기'], ['exec-3', '외부 API 대기']] },
      title: '장애: controller가 느리면 thread가 바닥남',
      summary: '모든 worker thread가 느린 호출을 기다리면, 새 요청은 큐에서 줄을 섭니다.',
      detail:
        '요청 하나가 응답까지 thread 하나를 잡으므로, controller가 느린 외부 API를 기다리면 thread가 하나씩 묶입니다. `threads.max`(200)개가 모두 묶이면 새 요청은 thread pool 큐에서 기다리고, 큐 기본 용량이 사실상 무제한이라 거절 대신 지연이 커집니다. timeout 설정이 필요한 이유입니다.',
      facts: [
        { key: 'threads.max', value: '200' },
        { key: 'threads.max-queue-capacity', value: '2147483647 (사실상 무제한)' },
        { key: 'max-connections', value: '8192' },
      ],
      lines: ['exec-1..200: 외부 API 대기', '새 요청 → 큐에서 대기'],
      sources: [s.tomcatThreads, s.tomcatConnections, s.execSubmit],
    },
  ],
  overview: [
    {
      title: '한 장의 그림: thread 하나가 끝까지',
      body: `요청은 왼쪽에서 오른쪽으로 갑니다. Tomcat이 받아 worker thread(\`http-nio-8080-exec-N\`) 하나에 맡기고, 그 thread가 Filter chain → \`DispatcherServlet\` → \`HandlerMapping\`(무엇을 부를지) → \`HandlerAdapter\`(어떻게 부를지) → \`@RequestBody\` 변환 → controller → \`@ResponseBody\` 변환까지 동기적으로 실행합니다. 응답은 같은 길을 거꾸로 나갑니다.

이 모델에서 thread 수(\`server.tomcat.threads.max\`, 기본 200)가 동시에 처리하는 요청 수의 상한입니다. controller가 느려지면 thread가 바닥나고, 새 요청은 큐에서 기다립니다.`,
      sources: [s.starterWebmvc, s.execName, s.tomcatThreads, s.doDispatch, s.dispatcherDocs],
    },
    {
      title: 'Filter와 Interceptor의 위치 차이',
      body: `Filter는 Servlet container 쪽, \`DispatcherServlet\` 앞에서 실행되고 \`@Order\`로 순서를 정합니다. Interceptor는 \`DispatcherServlet\` 안, handler가 정해진 뒤 \`preHandle()\` → handler → \`postHandle()\` → \`afterCompletion()\` 순서로 실행됩니다. Interceptor는 어떤 handler가 불릴지 알지만, Filter는 모릅니다.

\`@ResponseBody\` 응답은 \`HandlerAdapter\` 안에서 commit되므로 \`postHandle()\`에서는 header를 바꿀 수 없습니다. 응답을 바꾸려면 \`ResponseBodyAdvice\`를 씁니다.`,
      sources: [s.bootFilterDocs, s.filterChain, s.preHandle, s.interceptors, s.interceptorDocs],
    },
    {
      title: '변환은 HttpMessageConverter가 한다',
      body: `\`@RequestBody\`와 \`@ResponseBody\`는 모두 \`RequestResponseBodyMethodProcessor\`가 처리하고, 실제 bytes ↔ 객체 변환은 \`HttpMessageConverter\`가 합니다. 요청은 \`Content-Type\`, 응답은 \`Accept\`와 converter가 만들 수 있는 type을 맞춰 converter를 고릅니다. JSON이면 Jackson converter입니다. \`@RestController\`는 \`@Controller\` + \`@ResponseBody\`라서 반환 객체가 곧 응답 body입니다.`,
      sources: [s.supportsParameter, s.readConverters, s.supportsReturn, s.writeConverters, s.restControllerDocs, s.requestBodyDocs, s.responseBodyDocs],
    },
  ],
  selfCheck: [
    {
      question: '요청 하나가 Tomcat에 들어와 응답이 나갈 때까지의 경로를 순서대로 그려 보세요.',
      answer: 'Client → Tomcat(worker thread 배정) → Filter chain → `DispatcherServlet` → `HandlerMapping`(handler 찾기) → `HandlerAdapter` → argument resolver + `HttpMessageConverter`(`@RequestBody`) → controller → return value handler + converter(`@ResponseBody`) → Filter 역순 → Tomcat → Client.',
    },
    {
      question: 'controller가 느린 외부 API를 기다리면 서버 전체에 무슨 일이 생기나요?',
      answer: '요청마다 worker thread 하나가 응답까지 묶입니다. `server.tomcat.threads.max`(기본 200)개가 모두 묶이면 새 요청은 thread pool 큐에서 기다리고, 큐 기본 용량이 사실상 무제한이라 거절 대신 지연이 커집니다.',
    },
    {
      question: 'Filter와 HandlerInterceptor는 어디서 실행되고, 무엇이 다른가요?',
      answer: 'Filter는 `DispatcherServlet` 앞, Servlet container에서 `@Order` 순서로 실행됩니다. Interceptor는 `DispatcherServlet` 안에서 handler가 정해진 뒤 `preHandle()` → handler → `postHandle()` → `afterCompletion()` 순서로 실행되고, 어떤 handler인지 압니다.',
    },
    {
      question: '`DispatcherServlet`은 controller 메서드를 어떻게 찾고, 왜 `HandlerAdapter`를 거쳐 부르나요?',
      answer: '`HandlerMapping`을 order 순서로 물어 첫 non-null `HandlerExecutionChain`을 씁니다. handler 타입이 여러 가지라서 `supports(handler)`가 true인 adapter에 실행을 맡깁니다. `@RequestMapping` 메서드는 `RequestMappingHandlerAdapter`가 부릅니다.',
    },
    {
      question: '`@RequestBody` JSON이 객체가 되는 과정과, `@RestController`의 반환 객체가 JSON이 되는 과정은?',
      answer: '둘 다 `RequestResponseBodyMethodProcessor`가 맡고, 실제 변환은 `HttpMessageConverter`(JSON이면 Jackson)가 합니다. 요청은 `Content-Type`, 응답은 `Accept`를 기준으로 converter를 고릅니다.',
    },
    {
      question: '`postHandle()`에서 응답 header를 추가해도 반영되지 않는 이유와 대안은?',
      answer: '`@ResponseBody` 응답은 `HandlerAdapter` 안에서 이미 쓰이고 commit되었기 때문입니다. `ResponseBodyAdvice`를 쓰거나, Filter라면 `chain.doFilter()` 전에 header를 넣습니다.',
    },
  ],
};
