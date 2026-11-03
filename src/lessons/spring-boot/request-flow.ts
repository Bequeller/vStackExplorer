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
  interceptors: { label: 'WebMvcConfigurationSupport.getInterceptors()', url: `${WEBMVC}/config/annotation/WebMvcConfigurationSupport.java#L303-L311`, version: SF_V },
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

export const lesson: Lesson = {
  id: 'request-flow',
  topic: 'spring-boot',
  title: 'HTTP 요청 한 건이 Spring MVC를 지나가는 길',
  subtitle: 'HTTP 요청 흐름',
  summary:
    '`POST /api/orders` 요청 하나를 Tomcat worker thread → Filter chain → `DispatcherServlet` → `HandlerMapping` → `HandlerAdapter` → argument resolver와 message converter → controller → return value 처리 → 응답까지 따라갑니다.',
  versions: {
    'Spring Boot': '4.1.2',
    'Spring Framework': '7.0.10',
    'Apache Tomcat': '11.0.27',
  },
  scene: { width: 1320, height: 960 },
  layers: [
    { id: 'servlet', label: 'Servlet' },
    { id: 'mvc', label: 'Spring MVC' },
    { id: 'app', label: 'Application' },
  ],
  nodes: [
    { id: 'client', label: 'Client', sublabel: 'HTTP/1.1', kind: 'client', icon: 'laptop', x: 160, y: 380 },
    { id: 'tomcat', label: 'Tomcat', sublabel: 'http-nio-8080', kind: 'container', icon: 'server', x: 400, y: 300 },
    { id: 'filters', label: 'Filter chain', sublabel: 'ApplicationFilterChain', kind: 'container', icon: 'filter-stack', x: 640, y: 380 },
    { id: 'dispatcher', label: 'DispatcherServlet', sublabel: 'doDispatch()', kind: 'framework', icon: 'hub', x: 880, y: 300 },
    { id: 'mapping', label: 'HandlerMapping', sublabel: 'getHandler()', kind: 'framework', icon: 'index', x: 1150, y: 380 },
    { id: 'adapter', label: 'HandlerAdapter', sublabel: 'RequestMappingHandlerAdapter', kind: 'framework', icon: 'adapter', x: 880, y: 620 },
    { id: 'resolver', label: 'ArgumentResolver', sublabel: '+ HttpMessageConverter', kind: 'framework', icon: 'converter', x: 600, y: 700 },
    { id: 'controller', label: 'OrderController', sublabel: '@RestController', kind: 'app', icon: 'controller', x: 1160, y: 700 },
    { id: 'returns', label: 'ReturnValueHandler', sublabel: '+ HttpMessageConverter', kind: 'framework', icon: 'converter', x: 880, y: 880 },
  ],
  states: [
    {
      node: 'tomcat',
      title: 'worker thread pool (예시 3개)',
      view: {
        type: 'table',
        columns: ['thread', '상태'],
        rows: [
          ['http-nio-8080-exec-1', '대기'],
          ['http-nio-8080-exec-2', '대기'],
          ['http-nio-8080-exec-3', '대기'],
        ],
      },
    },
    {
      node: 'filters',
      title: 'Boot 기본 Filter (order 순)',
      view: {
        type: 'table',
        columns: ['order', 'filter bean', '상태'],
        rows: [
          ['MIN_VALUE', 'characterEncodingFilter', '대기'],
          ['-9900', 'formContentFilter', '대기'],
          ['-105', 'requestContextFilter', '대기'],
        ],
      },
    },
    {
      node: 'mapping',
      title: 'handlerMappings (order 순, 일부)',
      view: {
        type: 'table',
        columns: ['order', 'HandlerMapping', '반환'],
        rows: [
          ['-1', 'RouterFunctionMapping', '—'],
          ['0', 'RequestMappingHandlerMapping', '—'],
          ['2', 'BeanNameUrlHandlerMapping', '—'],
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
    {
      node: 'resolver',
      title: 'create() 인자',
      view: { type: 'list', items: ['args[0] = (미해결)'] },
    },
  ],
  steps: [
    {
      id: 'arrive',
      layer: 'servlet',
      kind: 'move',
      from: 'client',
      to: 'tomcat',
      token: { kind: 'request', label: 'POST /api/orders' },
      title: '요청이 Tomcat connector에 도착',
      summary: '`Acceptor`가 연결을 받고 `Poller`가 읽을 데이터가 생긴 socket을 고릅니다.',
      detail:
        'embedded Tomcat의 기본 protocol은 `Http11NioProtocol`이고 connector 이름은 `http-nio-8080`입니다. `-Acceptor` thread가 TCP 연결을 accept하고, `-Poller` thread가 NIO selector로 읽을 준비가 된 socket을 찾습니다. HTTP 파싱과 애플리케이션 코드는 이 둘이 아니라 worker thread에서 실행됩니다.',
      facts: [
        { key: 'protocol', value: '`Http11NioProtocol`' },
        { key: 'server.port 기본값', value: '8080' },
        { key: 'max-connections / accept-count', value: '8192 / 100' },
      ],
      lines: ['POST /api/orders HTTP/1.1', 'Content-Type: application/json', 'Content-Length: 29'],
      record: {
        title: 'HTTP request',
        protocol: 'HTTP/1.1',
        raw: REQUEST_RAW,
        wire: true,
        segments: [
          { id: 'request-line', label: 'request line' },
          { id: 'headers', label: 'headers' },
          { id: 'body', label: 'body' },
        ],
        fields: [
          { name: 'method', value: 'POST', note: '`@PostMapping`과 매칭될 method', segment: 'request-line', span: 'POST' },
          { name: 'request-target', value: '/api/orders', note: '`HandlerMapping`의 lookup path', segment: 'request-line', span: '/api/orders' },
          { name: 'HTTP-version', value: 'HTTP/1.1', note: 'request line의 마지막 토큰', segment: 'request-line', span: 'HTTP/1.1' },
          { name: 'Host', value: 'localhost:8080', note: 'HTTP/1.1에서 필수인 대상 host', segment: 'headers', span: 'Host: localhost:8080', example: true },
          { name: 'Content-Type', value: 'application/json', note: 'body를 읽을 converter를 고르는 기준', segment: 'headers', span: 'Content-Type: application/json' },
          { name: 'Accept', value: 'application/json', note: '응답 converter를 고르는 기준', segment: 'headers', span: 'Accept: application/json' },
          { name: 'Content-Length', value: '29', note: 'body의 byte 수', segment: 'headers', span: 'Content-Length: 29' },
          { name: 'message-body', value: '{"productId":42,"quantity":2}', note: '`@RequestBody`가 읽을 JSON', segment: 'body', span: '{"productId":42,"quantity":2}', example: true },
        ],
      },
      sources: [s.defaultProtocol, s.defaultPort, s.namePrefix, s.nameInternal, s.endpointName, s.acceptor, s.poller, s.tomcatConnections, s.rfcRequestLine],
    },
    {
      id: 'worker',
      layer: 'servlet',
      kind: 'mutate',
      node: 'tomcat',
      after: {
        type: 'table',
        columns: ['thread', '상태'],
        rows: [
          ['http-nio-8080-exec-1', 'POST /api/orders'],
          ['http-nio-8080-exec-2', '대기'],
          ['http-nio-8080-exec-3', '대기'],
        ],
      },
      title: 'worker thread 하나가 요청을 맡음',
      summary: '`SocketProcessor`가 executor에 제출되고, 이 thread가 응답까지 끝까지 처리합니다.',
      detail:
        '`Poller`는 socket을 `SocketProcessor`로 감싸 `executor.execute()`로 넘깁니다. 이후 Filter, `DispatcherServlet`, controller, 응답 쓰기까지 모두 이 한 thread에서 동기적으로 실행됩니다. 그래서 `ThreadLocal` 기반의 `RequestContextHolder`가 요청 단위로 동작합니다. 그림의 `exec-1`은 예시입니다.',
      facts: [
        { key: 'thread 이름', value: '`http-nio-8080-exec-N`' },
        { key: 'threads.max / min-spare', value: '200 / 10' },
        { key: 'threads.max-queue-capacity', value: '2147483647' },
      ],
      lines: ['executor.execute(socketProcessor)', '→ http-nio-8080-exec-1'],
      sources: [s.execName, s.execSubmit, s.tomcatThreads],
    },
    {
      id: 'to-filters',
      layer: 'servlet',
      kind: 'move',
      from: 'tomcat',
      to: 'filters',
      token: { kind: 'call', label: 'filterChain.doFilter()' },
      title: 'Valve pipeline을 지나 Filter chain으로',
      summary: '`CoyoteAdapter`가 pipeline을 부르고 `StandardWrapperValve`가 `ApplicationFilterChain`을 만듭니다.',
      detail:
        '`Http11Processor`가 request line과 header를 파싱한 뒤 `CoyoteAdapter.service()`를 부릅니다. Engine → Host → Context → Wrapper의 Valve pipeline이 차례로 실행되고, 마지막 `StandardWrapperValve`가 Filter들과 대상 Servlet으로 `ApplicationFilterChain`을 만들어 `doFilter()`를 호출합니다.',
      facts: [
        { key: '파싱 후 호출', value: '`getAdapter().service(req, res)`' },
        { key: 'chain 생성', value: '`ApplicationFilterFactory.createFilterChain()`' },
      ],
      sources: [s.adapterService, s.pipeline, s.wrapperValve],
    },
    {
      id: 'filters-pass',
      layer: 'servlet',
      kind: 'mutate',
      node: 'filters',
      after: {
        type: 'table',
        columns: ['order', 'filter bean', '상태'],
        rows: [
          ['MIN_VALUE', 'characterEncodingFilter', '통과'],
          ['-9900', 'formContentFilter', '통과'],
          ['-105', 'requestContextFilter', '통과'],
        ],
      },
      title: 'Filter가 order 순서로 실행됨',
      summary: 'Boot가 등록한 Filter bean 3개가 낮은 order부터 실행됩니다.',
      detail:
        '`characterEncodingFilter`는 request encoding을 UTF-8로 강제하고, `formContentFilter`는 `PUT`·`PATCH`·`DELETE`의 form body만 파싱하므로 이 JSON `POST`에는 하는 일이 없습니다. `requestContextFilter`는 request를 `RequestContextHolder`에 묶습니다. 각 Filter는 `chain.doFilter()`로 다음을 부릅니다.',
      facts: [
        { key: 'characterEncodingFilter', value: '`Ordered.HIGHEST_PRECEDENCE`' },
        { key: 'formContentFilter', value: '-9900' },
        { key: 'requestContextFilter', value: '-105' },
        { key: 'encoding force (요청/응답)', value: 'true / false' },
      ],
      lines: ['characterEncodingFilter → formContentFilter', '→ requestContextFilter → servlet'],
      sources: [s.bootFilterDocs, s.starterWebmvc, s.encodingFilterOrder, s.formFilterOrder, s.contextFilterOrder, s.wrapperMaxOrder, s.encodingProps, s.mvcFilters, s.encodingFilter, s.formFilterMethods, s.contextFilter],
    },
    {
      id: 'to-dispatcher',
      layer: 'servlet',
      kind: 'move',
      from: 'filters',
      to: 'dispatcher',
      token: { kind: 'call', label: 'servlet.service()' },
      title: '마지막 Filter 다음은 DispatcherServlet',
      summary: '`service()` → `doPost()` → `processRequest()` → `doService()` → `doDispatch()`.',
      detail:
        'Filter를 다 돌면 `ApplicationFilterChain`이 Servlet의 `service()`를 부릅니다. Boot에서 이 Servlet은 `/`에 매핑된 `DispatcherServlet` 하나입니다. `FrameworkServlet`이 `doPost()` → `processRequest()`로 받아 `doService()`가 request attribute를 준비하고, 실제 분배는 `doDispatch()`가 합니다.',
      facts: [
        { key: 'Filter 다음 호출', value: '`servlet.service(req, res)`' },
        { key: '분배 메서드', value: '`DispatcherServlet.doDispatch()`' },
      ],
      sources: [s.filterChain, s.frameworkServlet, s.doService, s.dispatcherDocs, s.bootFilterDocs],
    },
    {
      id: 'to-mapping',
      layer: 'mvc',
      kind: 'move',
      from: 'dispatcher',
      to: 'mapping',
      token: { kind: 'call', label: 'getHandler(request)' },
      title: 'HandlerMapping에게 handler를 묻기',
      summary: '`checkMultipart()` 뒤 `getHandler()`가 `HandlerMapping`을 order 순서대로 묻습니다.',
      detail:
        '`DispatcherServlet`은 context의 모든 `HandlerMapping` bean을 정렬해 두고, 순서대로 `getHandler(request)`를 불러 null이 아닌 첫 결과를 씁니다. 아무것도 찾지 못하면 `NoHandlerFoundException`을 던집니다.',
      facts: [
        { key: '순회 규칙', value: 'order 순, null이 아닌 첫 결과' },
        { key: 'RouterFunction / RequestMapping / BeanNameUrl', value: '-1 / 0 / 2' },
        { key: 'handler가 없으면', value: '`NoHandlerFoundException`' },
      ],
      sources: [s.doDispatch, s.getHandler, s.sortMappings, s.mappingOrders, s.specialBeans],
    },
    {
      id: 'mapping-match',
      layer: 'mvc',
      kind: 'mutate',
      node: 'mapping',
      after: {
        type: 'table',
        columns: ['order', 'HandlerMapping', '반환'],
        rows: [
          ['-1', 'RouterFunctionMapping', 'null'],
          ['0', 'RequestMappingHandlerMapping', 'HandlerMethod'],
          ['2', 'BeanNameUrlHandlerMapping', '—'],
        ],
      },
      title: '@PostMapping 메서드를 찾음',
      summary: '`RequestMappingHandlerMapping`이 `OrderController#create`를 `HandlerExecutionChain`으로 돌려줍니다.',
      detail:
        '`RouterFunction`이 없으니 `RouterFunctionMapping`은 null입니다. `RequestMappingHandlerMapping`은 lookup path `/api/orders`와 method `POST`를 `@RequestMapping` 조건과 비교해 메서드를 고르고, interceptor 목록과 묶어 돌려줍니다. 첫 결과가 나왔으므로 다음 mapping(—)은 조회하지 않습니다.',
      facts: [
        { key: '매칭 메서드', value: '`lookupHandlerMethod()`' },
        { key: 'path 매칭 기본값', value: '`PathPatternParser` (6.0부터)' },
        { key: '반환 타입', value: '`HandlerExecutionChain`' },
      ],
      record: {
        title: 'HandlerExecutionChain',
        protocol: 'Java object',
        raw: 'HandlerExecutionChain\n  handler = OrderController#create(OrderRequest)\n  interceptorList[0] = ConversionServiceExposingInterceptor\n  interceptorList[1] = ResourceUrlProviderExposingInterceptor',
        wire: false,
        segments: [
          { id: 'handler', label: 'handler' },
          { id: 'interceptors', label: 'interceptors' },
        ],
        fields: [
          { name: 'handler', value: 'HandlerMethod', note: '`@PostMapping`이 붙은 controller 메서드', segment: 'handler', span: 'OrderController#create(OrderRequest)' },
          { name: 'interceptorList[0]', value: 'ConversionServiceExposingInterceptor', note: 'MVC 설정이 모든 mapping에 추가', segment: 'interceptors', span: 'ConversionServiceExposingInterceptor' },
          { name: 'interceptorList[1]', value: 'ResourceUrlProviderExposingInterceptor', note: 'MVC 설정이 모든 mapping에 추가', segment: 'interceptors', span: 'ResourceUrlProviderExposingInterceptor' },
        ],
      },
      sources: [s.lookup, s.pathParser, s.interceptors, s.interceptorDocs],
    },
    {
      id: 'to-adapter',
      layer: 'mvc',
      kind: 'move',
      from: 'dispatcher',
      to: 'adapter',
      token: { kind: 'call', label: 'ha.handle(req, res, handler)' },
      title: 'preHandle 다음 HandlerAdapter 호출',
      summary: '`preHandle()`이 모두 true면 `supports(handler)`가 true인 adapter의 `handle()`을 부릅니다.',
      detail:
        '`applyPreHandle()`이 interceptor의 `preHandle()`을 차례로 부르고, 하나라도 false면 handler를 실행하지 않습니다. `DispatcherServlet`은 handler 타입을 직접 모르므로 `supports(handler)`가 true인 첫 `HandlerAdapter`에 실행을 맡깁니다. `HandlerMethod`는 `RequestMappingHandlerAdapter`가 맡습니다.',
      facts: [
        { key: 'preHandle이 false면', value: 'handler 실행 없이 반환' },
        { key: 'adapter 선택', value: '`supports(handler)` 첫 true' },
        { key: 'RequestMappingHandlerAdapter', value: '`handler instanceof HandlerMethod`' },
      ],
      sources: [s.doDispatch, s.preHandle, s.getAdapter, s.supports, s.interceptorDocs],
    },
    {
      id: 'to-resolver',
      layer: 'mvc',
      kind: 'move',
      from: 'adapter',
      to: 'resolver',
      token: { kind: 'data', label: '29 bytes JSON' },
      title: '인자마다 argument resolver를 찾음',
      summary: '`@RequestBody` 파라미터는 `RequestResponseBodyMethodProcessor`가 맡습니다.',
      detail:
        '`invokeHandlerMethod()`가 `HandlerMethod`를 `ServletInvocableHandlerMethod`로 감싸 `invokeAndHandle()`을 부릅니다. 메서드 호출 전 `getMethodArgumentValues()`가 파라미터마다 `supportsParameter()`가 true인 resolver를 찾습니다. 기본 목록은 annotation 기반 → type 기반 → custom → catch-all 순서입니다.',
      facts: [
        { key: '선택 기준', value: '`supportsParameter()`' },
        { key: '@RequestBody resolver', value: '`RequestResponseBodyMethodProcessor`' },
      ],
      lines: ['create(@RequestBody OrderRequest request)', '→ RequestResponseBodyMethodProcessor'],
      sources: [s.argResolvers, s.invokeHandler, s.argValues, s.supportsParameter],
    },
    {
      id: 'read-body',
      layer: 'mvc',
      kind: 'mutate',
      node: 'resolver',
      after: { type: 'list', items: ['args[0] = OrderRequest[productId=42, quantity=2]'] },
      title: 'HttpMessageConverter가 JSON을 객체로 읽음',
      summary: '`application/json`을 읽을 수 있는 첫 converter가 body를 `OrderRequest`로 바꿉니다.',
      detail:
        '`readWithMessageConverters()`는 converter를 순서대로 돌며 `canRead(타입, Content-Type)`가 true인 첫 converter로 읽습니다. Boot는 `JsonMapper` bean이 있으면 Jackson 3용 `JacksonJsonHttpMessageConverter`를 등록합니다. `@Valid`가 있으면 이어서 검증하고, 실패하면 `MethodArgumentNotValidException`이 납니다.',
      facts: [
        { key: 'converter 선택', value: '`canRead()` 첫 true' },
        { key: 'JSON converter', value: '`JacksonJsonHttpMessageConverter`' },
        { key: '지원 media type', value: '`application/json`, `application/*+json`' },
      ],
      record: {
        title: 'JSON body → OrderRequest',
        protocol: 'JSON',
        raw: '{"productId":42,"quantity":2}',
        wire: true,
        segments: [{ id: 'json', label: 'JSON object' }],
        fields: [
          { name: 'productId', value: '42', note: 'JSON number → `OrderRequest.productId`', segment: 'json', span: '"productId":42', example: true },
          { name: 'quantity', value: '2', note: 'JSON number → `OrderRequest.quantity`', segment: 'json', span: '"quantity":2', example: true },
        ],
      },
      sources: [s.readConverters, s.resolveArgument, s.jacksonTypes, s.bootJackson, s.requestBodyDocs],
    },
    {
      id: 'invoke',
      layer: 'app',
      kind: 'move',
      from: 'adapter',
      to: 'controller',
      token: { kind: 'call', label: 'create(request)' },
      title: 'controller 메서드 실행',
      summary: '준비된 인자로 `doInvoke()`가 reflection으로 `OrderController.create()`를 부릅니다.',
      detail:
        '여기서부터 애플리케이션 코드입니다. 예시 controller는 `@RestController` 클래스의 `@PostMapping` `@ResponseStatus(HttpStatus.CREATED)` 메서드 `OrderResponse create(@RequestBody OrderRequest request)`입니다. service와 DB를 다녀오는 동안에도 같은 worker thread가 기다립니다.',
      facts: [
        { key: '호출', value: '`InvocableHandlerMethod.doInvoke(args)`' },
        { key: '실행 thread', value: '같은 `http-nio-8080-exec-N`' },
      ],
      lines: ['@PostMapping @ResponseStatus(CREATED)', 'OrderResponse create(@RequestBody OrderRequest request)'],
      sources: [s.doInvoke, s.invokeAndHandle],
    },
    {
      id: 'status',
      layer: 'mvc',
      kind: 'mutate',
      node: 'adapter',
      after: {
        type: 'table',
        columns: ['항목', '값'],
        rows: [
          ['requestHandled', 'false'],
          ['status', '201'],
          ['committed', 'false'],
        ],
      },
      title: '@ResponseStatus가 상태 코드를 바꿈',
      summary: '반환 직후 `setResponseStatus()`가 `response.setStatus(201)`을 부릅니다.',
      detail:
        '`invokeAndHandle()`은 메서드가 반환하자마자 `setResponseStatus()`를 부릅니다. `@ResponseStatus`에 `reason`이 있으면 대신 `sendError()`로 끝내지만, 여기는 없으므로 상태만 201로 바꿉니다. 아직 아무것도 전송되지 않았으므로(`committed = false`) 상태를 자유롭게 바꿀 수 있습니다.',
      facts: [
        { key: 'status 설정', value: '`response.setStatus(201)`' },
        { key: 'reason이 있으면', value: '`sendError(status, reason)` 후 종료' },
      ],
      sources: [s.setStatus, s.invokeAndHandle],
    },
    {
      id: 'to-returns',
      layer: 'mvc',
      kind: 'move',
      from: 'controller',
      to: 'returns',
      token: { kind: 'data', label: 'OrderResponse' },
      title: '반환 값을 처리할 handler 선택',
      summary: '`@RestController`이므로 `RequestResponseBodyMethodProcessor`가 반환 값을 맡습니다.',
      detail:
        '`selectHandler()`는 `supportsReturnType()`이 true인 첫 handler를 고릅니다. `OrderResponse`는 `ModelAndView`, `ResponseEntity` 같은 앞쪽 타입이 아니고, `@RestController`가 `@ResponseBody`를 meta-annotation으로 가지므로 `RequestResponseBodyMethodProcessor`가 선택됩니다. 인자와 반환을 같은 클래스가 맡는 셈입니다.',
      facts: [
        { key: '선택 기준', value: '`supportsReturnType()`' },
        { key: '조건', value: '클래스나 메서드에 `@ResponseBody`' },
      ],
      lines: ['OrderResponse[orderId=1001, status=CREATED]', '→ RequestResponseBodyMethodProcessor'],
      sources: [s.returnHandlers, s.selectHandler, s.supportsReturn, s.responseBodyDocs, s.restControllerDocs],
    },
    {
      id: 'write-body',
      layer: 'mvc',
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
      title: 'content negotiation 후 응답 body를 씀',
      summary: '`requestHandled = true`로 표시하고 `application/json`으로 body를 씁니다.',
      detail:
        '`handleReturnValue()`는 "view를 렌더링하지 말 것"을 표시한 뒤 `Accept`와 converter의 producible type을 비교해 `application/json`을 고릅니다. Jackson converter는 길이를 미리 계산하지 않고 쓴 뒤 `flush()`하므로 응답이 이 자리에서 commit됩니다. 그래서 `postHandle()`에서 header를 넣기엔 늦습니다.',
      facts: [
        { key: 'view 생략 표시', value: '`setRequestHandled(true)`' },
        { key: 'selectedMediaType', value: '`application/json`' },
        { key: 'header 추가 대안', value: '`ResponseBodyAdvice`' },
      ],
      record: {
        title: 'JSON 응답 body',
        protocol: 'JSON',
        raw: RESPONSE_BODY,
        wire: true,
        segments: [{ id: 'json', label: 'JSON object' }],
        fields: [
          { name: 'orderId', value: '1001', note: '`OrderResponse.orderId`를 직렬화', segment: 'json', span: '"orderId":1001', example: true },
          { name: 'status', value: '"CREATED"', note: '`OrderResponse.status`를 직렬화', segment: 'json', span: '"status":"CREATED"', example: true },
        ],
      },
      sources: [s.handleReturn, s.writeConverters, s.defaultHeaders, s.jacksonWrite, s.interceptorDocs],
    },
    {
      id: 'no-view',
      layer: 'mvc',
      kind: 'move',
      from: 'adapter',
      to: 'dispatcher',
      token: { kind: 'data', label: 'ModelAndView = null' },
      title: 'ModelAndView 없이 DispatcherServlet으로 복귀',
      summary: '`requestHandled`가 true이므로 `getModelAndView()`가 null이고 `render()`는 건너뜁니다.',
      detail:
        '`getModelAndView()`는 `isRequestHandled()`가 true면 null을 돌려줍니다. `doDispatch()`는 `postHandle()`을 부른 뒤 `processDispatchResult()`로 가는데, `mv`가 null이므로 `ViewResolver`를 쓰지 않습니다. 마지막으로 `afterCompletion()`이 불립니다. 예외가 났다면 여기서 `HandlerExceptionResolver`가 처리합니다.',
      facts: [
        { key: 'handle() 반환', value: 'null' },
        { key: 'render 조건', value: '`mv != null && !mv.wasCleared()`' },
        { key: 'interceptor 순서', value: '`preHandle` → `postHandle` → `afterCompletion`' },
      ],
      sources: [s.getModelAndView, s.dispatchResult, s.doDispatch, s.dispatcherDocs],
    },
    {
      id: 'unwind',
      layer: 'servlet',
      kind: 'move',
      from: 'dispatcher',
      to: 'filters',
      token: { kind: 'response', label: '201 Created' },
      title: 'Filter chain을 거꾸로 빠져나옴',
      summary: '각 Filter의 `chain.doFilter()` 다음 코드가 역순으로 실행됩니다.',
      detail:
        '`service()`가 반환되면 call stack이 풀리며 Filter들이 역순으로 `chain.doFilter()` 뒤의 코드를 실행합니다. `requestContextFilter`는 `finally`에서 `RequestContextHolder`를 비워, 같은 thread가 다음 요청을 받을 때 값이 남지 않게 합니다. body가 이미 commit되었으므로 이때 header를 바꿔도 반영되지 않습니다.',
      facts: [
        { key: '실행 순서', value: '요청 때의 역순' },
        { key: 'requestContextFilter', value: '`finally { resetContextHolders(); }`' },
      ],
      sources: [s.contextFilter, s.filterChain, s.interceptorDocs],
    },
    {
      id: 'respond',
      layer: 'servlet',
      kind: 'move',
      from: 'tomcat',
      to: 'client',
      token: { kind: 'response', label: '201 · chunked' },
      title: 'Tomcat이 응답을 전송',
      summary: '길이를 모르므로 `Transfer-Encoding: chunked`로 보내고 `Date`를 붙입니다.',
      detail:
        '`prepareResponse()`는 `Content-Length`가 없고 HTTP/1.1이며 body가 있으면 chunked encoding을 고릅니다. 각 chunk는 16진수 크기, CRLF, 데이터, CRLF이고 `0` chunk로 끝납니다. application이 `Date`를 넣지 않았으므로 Tomcat이 붙이고, reason phrase("Created")는 보내지 않습니다.',
      facts: [
        { key: 'body 길이 표시', value: '`Transfer-Encoding: chunked`' },
        { key: 'chunk 크기', value: '16진수 (35 bytes = `23`)' },
        { key: 'Date', value: 'Tomcat이 추가' },
      ],
      lines: ['HTTP/1.1 201', 'Content-Type: application/json', 'Transfer-Encoding: chunked'],
      record: {
        title: 'HTTP response',
        protocol: 'HTTP/1.1',
        raw: RESPONSE_RAW,
        wire: true,
        segments: [
          { id: 'status-line', label: 'status line' },
          { id: 'headers', label: 'headers' },
          { id: 'chunked-body', label: 'chunked body' },
        ],
        fields: [
          { name: 'HTTP-version', value: 'HTTP/1.1', note: 'status line의 첫 토큰', segment: 'status-line', span: 'HTTP/1.1' },
          { name: 'status-code', value: '201', note: '`@ResponseStatus(CREATED)`에서', segment: 'status-line', span: '201' },
          { name: 'reason-phrase', value: '(비어 있음)', note: 'Tomcat은 공백 뒤 reason phrase를 생략', segment: 'status-line' },
          { name: 'Content-Type', value: 'application/json', note: 'Spring converter가 정한 값', segment: 'headers', span: 'Content-Type: application/json' },
          { name: 'Transfer-Encoding', value: 'chunked', note: '길이를 몰라 Tomcat이 추가', segment: 'headers', span: 'Transfer-Encoding: chunked' },
          { name: 'Date', value: 'Tue, 03 Nov 2026 05:12:09 GMT', note: 'Tomcat이 추가한 현재 시각', segment: 'headers', span: 'Date: Tue, 03 Nov 2026 05:12:09 GMT', example: true },
          { name: 'chunk-size', value: '23', note: '16진수 35: 뒤따르는 데이터 byte 수', segment: 'chunked-body', span: '23', example: true },
          { name: 'chunk-data', value: RESPONSE_BODY, note: 'converter가 쓴 JSON', segment: 'chunked-body', span: RESPONSE_BODY, example: true },
          { name: 'last-chunk', value: '0', note: '크기 0 chunk + 빈 줄로 body 끝', segment: 'chunked-body', span: '0' },
        ],
      },
      sources: [s.prepareResponse, s.dateHeader, s.sendStatus, s.chunkedFilter, s.jacksonWrite, s.rfcChunked, s.rfcStatusLine],
    },
    {
      id: 'release',
      layer: 'servlet',
      kind: 'mutate',
      node: 'tomcat',
      after: {
        type: 'table',
        columns: ['thread', '상태'],
        rows: [
          ['http-nio-8080-exec-1', '대기'],
          ['http-nio-8080-exec-2', '대기'],
          ['http-nio-8080-exec-3', '대기'],
        ],
      },
      title: 'worker thread가 pool로 돌아감',
      summary: 'thread는 pool로 돌아가고, keep-alive socket은 다시 `Poller`가 지켜봅니다.',
      detail:
        '`SocketProcessor` 작업이 끝나면 worker thread는 pool로 돌아갑니다. keep-alive 연결이면 socket은 `Poller`에 다시 등록되어 다음 요청이 오면 또 worker thread에 배정됩니다. 요청 하나가 응답이 끝날 때까지 thread 하나를 붙잡는다는 점이 이 모델의 핵심입니다.',
      facts: [
        { key: '동시 처리 상한', value: '`threads.max` = 200' },
        { key: 'keep-alive socket', value: '`registerReadInterest()`' },
      ],
      lines: ['http-nio-8080-exec-1 → pool', 'socket → Poller (keep-alive)'],
      sources: [s.keepAlive, s.tomcatThreads],
    },
  ],
  overview: [
    {
      title: 'Tomcat의 thread 모델',
      body: `Spring Boot의 embedded Tomcat은 \`Http11NioProtocol\`을 씁니다. connector 이름은 \`"http-nio"\`에 port를 붙인 \`http-nio-8080\`이고, thread 이름도 여기서 나옵니다. \`http-nio-8080-Acceptor\`가 연결을 accept하고, \`http-nio-8080-Poller\`가 NIO selector로 읽을 준비가 된 socket을 찾아 \`SocketProcessor\`를 worker pool에 제출합니다.

worker thread(\`http-nio-8080-exec-N\`)는 HTTP 파싱부터 Filter, \`DispatcherServlet\`, controller, 응답 쓰기까지 요청 하나를 끝까지 동기적으로 처리합니다. pool은 \`server.tomcat.threads.max\`(기본 200)와 \`min-spare\`(기본 10)로 정하고, 모두 바쁘면 작업은 큐(\`max-queue-capacity\` 기본 2147483647)에서 기다립니다. 연결 수 상한은 \`max-connections\`(8192), OS backlog는 \`accept-count\`(100)입니다.

응답 후 keep-alive 연결이면 socket은 다시 \`Poller\`에 등록됩니다. controller가 느린 외부 호출을 기다리면 그 시간만큼 200개 중 하나가 묶입니다.`,
      sources: [s.defaultProtocol, s.namePrefix, s.nameInternal, s.acceptor, s.poller, s.execName, s.execSubmit, s.tomcatThreads, s.tomcatConnections, s.keepAlive],
    },
    {
      title: 'Filter chain과 Boot 기본 Filter',
      body: `Boot는 \`Filter\` 타입의 bean을 embedded container에 등록하고 \`/*\`에 매핑합니다. 순서는 \`Ordered\`나 \`@Order\`로 정하고, 작을수록 먼저 실행됩니다. Security나 Actuator 없이 \`spring-boot-starter-webmvc\`만 있으면 \`characterEncodingFilter\`(\`Ordered.HIGHEST_PRECEDENCE\`), \`formContentFilter\`(-9900), \`requestContextFilter\`(-105)가 등록됩니다. request를 감싸는 Filter는 \`REQUEST_WRAPPER_FILTER_MAX_ORDER\`(0) 이하로 두라는 것이 Boot 문서의 권장입니다.

\`server.servlet.encoding\`의 기본값은 UTF-8, 요청 encoding 강제 true, 응답 encoding 강제 false입니다. \`formContentFilter\`는 \`PUT\`, \`PATCH\`, \`DELETE\`의 \`application/x-www-form-urlencoded\` body만 파싱합니다.

Filter는 \`chain.doFilter()\`를 부른 뒤에 나머지 코드를 실행하므로, chain은 요청 때 한 번, 응답 때 역순으로 한 번 지나갑니다. 응답이 commit된 뒤에는 header를 바꿔도 반영되지 않습니다.`,
      sources: [s.bootFilterDocs, s.starterWebmvc, s.encodingFilterOrder, s.formFilterOrder, s.contextFilterOrder, s.wrapperMaxOrder, s.encodingProps, s.encodingFilter, s.formFilterMethods, s.contextFilter],
    },
    {
      title: 'DispatcherServlet의 분배: HandlerMapping과 HandlerAdapter',
      body: `\`doDispatch()\`는 multipart 확인 → \`getHandler()\` → \`applyPreHandle()\` → \`getHandlerAdapter()\` → \`ha.handle()\` → \`applyPostHandle()\` → \`processDispatchResult()\` 순서로 진행합니다.

\`HandlerMapping\`은 정렬된 순서(\`RouterFunctionMapping\` -1, \`RequestMappingHandlerMapping\` 0, \`BeanNameUrlHandlerMapping\` 2)로 조회하고, null이 아닌 첫 \`HandlerExecutionChain\`을 씁니다. 이 chain은 handler와 interceptor 목록을 함께 담습니다.

\`HandlerAdapter\`를 두는 이유는 handler 타입이 여러 가지이기 때문입니다. \`supports(handler)\`가 true인 adapter가 실행 방법을 감싸므로 \`doDispatch()\`는 \`HandlerMethod\`, \`HttpRequestHandler\`, functional endpoint를 같은 코드로 실행합니다.`,
      sources: [s.doDispatch, s.getHandler, s.sortMappings, s.mappingOrders, s.getAdapter, s.supports, s.specialBeans, s.dispatcherDocs],
    },
    {
      title: '인자 해석과 반환 값 처리',
      body: `\`RequestMappingHandlerAdapter\`의 기본 argument resolver는 annotation 기반(\`@RequestParam\`, \`@PathVariable\`, \`@RequestBody\` 등) → type 기반(\`ServletRequest\`, \`Model\` 등) → custom → catch-all 순서입니다. \`@RequestBody\`는 \`RequestResponseBodyMethodProcessor\`가 맡고, \`Content-Type\`을 읽을 수 있는 첫 \`HttpMessageConverter\`가 body를 객체로 바꿉니다. body가 없는데 \`required\`면 \`HttpMessageNotReadableException\`이 납니다.

반환 값 처리기는 단일 용도 타입(\`ModelAndView\`, \`ResponseEntity\`, \`Callable\` 등) → annotation 기반 → 다용도 타입 → custom → catch-all 순서입니다. \`@RestController\`는 \`@Controller\`와 \`@ResponseBody\`의 meta-annotation이므로 반환 값을 \`RequestResponseBodyMethodProcessor\`가 씁니다.

이 처리기는 \`requestHandled\`를 true로 두고 content negotiation으로 media type을 정해 body를 씁니다. reference 문서대로 \`@ResponseBody\`의 응답은 \`HandlerAdapter\` 안에서 쓰이고 commit되므로, header를 더하려면 \`postHandle()\` 대신 \`ResponseBodyAdvice\`를 씁니다.`,
      sources: [s.argResolvers, s.supportsParameter, s.readConverters, s.resolveArgument, s.returnHandlers, s.supportsReturn, s.handleReturn, s.writeConverters, s.restControllerDocs, s.interceptorDocs],
    },
    {
      title: '응답이 전송되는 방식',
      body: `Spring의 \`AbstractHttpMessageConverter\`는 \`getContentLength()\`가 값을 주면 \`Content-Length\`를 설정하는데, Jackson converter는 기본값(null)을 쓰고 stream에 쓴 뒤 \`flush()\`합니다.

Tomcat의 \`prepareResponse()\`는 trailer가 없고, \`Content-Length\`가 정해져 있지 않으며, HTTP/1.1이고 body가 있으면 \`Transfer-Encoding: chunked\`를 붙입니다. chunk는 16진수 크기 + CRLF + 데이터 + CRLF이고, 마지막은 \`0\` + CRLF + CRLF입니다. application이 \`Date\`를 넣지 않으면 Tomcat이 현재 시각으로 붙이고, status line에는 reason phrase 없이 상태 코드와 공백만 씁니다.`,
      sources: [s.defaultHeaders, s.jacksonWrite, s.prepareResponse, s.chunkedFilter, s.dateHeader, s.sendStatus, s.rfcChunked, s.rfcStatusLine],
    },
  ],
  selfCheck: [
    {
      question: 'embedded Tomcat에서 controller 코드를 실행하는 thread의 이름 형식과, Spring Boot 기본 최대 개수는?',
      answer: '`http-nio-8080-exec-N`. connector 이름(`http-nio` + port)에 `-exec-`와 번호가 붙습니다. 최대 개수는 `server.tomcat.threads.max`의 기본값 200입니다.',
    },
    {
      question: '`spring-boot-starter-webmvc`만 있을 때 Boot가 등록하는 Filter 3개와 실행 순서는?',
      answer: '`characterEncodingFilter`(`Ordered.HIGHEST_PRECEDENCE`) → `formContentFilter`(-9900) → `requestContextFilter`(-105). order 값이 작을수록 먼저 실행되고, 응답 때는 역순으로 빠져나옵니다.',
    },
    {
      question: '`DispatcherServlet`은 handler를 어떻게 찾고, 언제 탐색을 멈추나요? 이 요청에서 handler를 찾은 `HandlerMapping`은?',
      answer: '정렬된 `handlerMappings`를 order 순서로 돌며 `getHandler()`를 부르고, null이 아닌 첫 `HandlerExecutionChain`에서 멈춥니다. `RouterFunctionMapping`(-1)은 null을 돌려주고 `RequestMappingHandlerMapping`(0)이 `OrderController#create`를 찾습니다.',
    },
    {
      question: '`DispatcherServlet`이 `HandlerAdapter`를 거쳐 handler를 부르는 이유는?',
      answer: 'handler의 타입이 여러 가지(`HandlerMethod`, `HttpRequestHandler`, functional endpoint 등)이기 때문입니다. `supports(handler)`가 true인 adapter가 실행 방법을 감싸므로 `doDispatch()`는 타입을 몰라도 됩니다.',
    },
    {
      question: '`@RequestBody OrderRequest`는 어떤 두 컴포넌트를 거쳐 객체가 되나요?',
      answer: '`RequestResponseBodyMethodProcessor`(argument resolver)가 파라미터를 맡고, `Content-Type: application/json`을 읽을 수 있는 첫 `HttpMessageConverter`인 `JacksonJsonHttpMessageConverter`가 body를 역직렬화합니다.',
    },
    {
      question: '`@RestController` 메서드가 객체를 반환하면 왜 view rendering이 일어나지 않나요?',
      answer: '`RequestResponseBodyMethodProcessor.handleReturnValue()`가 `mavContainer.setRequestHandled(true)` 후 body를 직접 씁니다. 그래서 `getModelAndView()`가 null을 돌려주고, `processDispatchResult()`는 `render()`를 부르지 않습니다.',
    },
    {
      question: '`postHandle()`에서 응답 header를 추가해도 반영되지 않는 이유와 대안은?',
      answer: '`@ResponseBody` 응답은 `HandlerAdapter` 안에서 이미 쓰이고 commit되었기 때문입니다. `ResponseBodyAdvice`를 쓰거나, Filter라면 `chain.doFilter()` 전에 header를 넣습니다.',
    },
    {
      question: '이 응답에 `Content-Length` 대신 `Transfer-Encoding: chunked`가 붙은 이유와, chunk 하나의 형식은?',
      answer: 'Jackson converter가 길이를 미리 정하지 않고 쓰고 `flush()`했고, Tomcat은 HTTP/1.1에서 body가 있고 길이를 모르면 chunked를 고르기 때문입니다. chunk는 16진수 크기 + CRLF + 데이터 + CRLF이고, `0` + CRLF + CRLF로 끝납니다.',
    },
  ],
};
